import { defineEventHandler, readBody, type H3Event } from "h3";
import { getClientIp } from "#server/utils/client-ip";
import {
  hitRateLimit,
  getAuthLockoutMs,
  recordAuthFailure,
  clearAuthFailures,
  purgeExpiredRateLimits,
} from "#server/utils/rate-limit-store";

// Rate limiting for sensitive endpoints (F5).
//
// - Client identity comes from getClientIp (trusted-proxy aware), never from
//   raw attacker-controlled X-Forwarded-For content.
// - Counters live in Postgres (rate-limit-store), so limits survive restarts
//   and hold across replicas.
// - The request path is normalised before matching, so variants like
//   //api/auth/sign-in or a trailing slash cannot skip the limiter.
// - Email sign-in additionally gets a per-account failure counter with
//   exponential backoff, so brute force is throttled even when every attempt
//   arrives from a fresh IP.

interface RateLimitRule {
  endpoints: string[];
  /** Restrict the rule to these HTTP methods; all methods when omitted. */
  methods?: string[];
  /** Match the endpoint exactly instead of as a prefix. */
  exact?: boolean;
  maxAttempts: number;
  windowMinutes: number;
  errorMessage: (remainingMinutes: number) => string;
}

const rules: RateLimitRule[] = [
  {
    endpoints: [
      "/api/auth/sign-in",
      "/api/auth/set-password",
      "/api/auth/reset-password",
      // better-auth 1.6 renamed forget-password to request-password-reset;
      // keep both so the limiter covers the live route either way.
      "/api/auth/forget-password",
      "/api/auth/request-password-reset",
    ],
    // POST only: these are all POST endpoints, and without the restriction a
    // stray GET (prefetch, probe) from the same IP eats the sign-in budget.
    methods: ["POST"],
    maxAttempts: 5,
    windowMinutes: 15,
    errorMessage: (remainingTime) =>
      `Too many attempts. Please try again in ${remainingTime} minutes.`,
  },
  {
    endpoints: ["/api/integrations/slack/interactions"],
    maxAttempts: 10,
    windowMinutes: 60,
    errorMessage: (remainingTime) =>
      `Too many feedback submissions. Please try again in ${remainingTime} minutes.`,
  },
  {
    endpoints: ["/api/marketing/demo-request"],
    maxAttempts: 5,
    windowMinutes: 60,
    errorMessage: (remainingTime) =>
      `Too many demo requests. Please try again in ${remainingTime} minutes.`,
  },
  {
    endpoints: ["/api/feedback"],
    methods: ["POST"],
    exact: true,
    maxAttempts: 20,
    windowMinutes: 60,
    errorMessage: (remainingTime) =>
      `Too many feedback submissions. Please try again in ${remainingTime} minutes.`,
  },
];

/**
 * Normalise a request path for limiter matching: strip the query string,
 * decode percent-encoding, collapse repeated slashes and drop any trailing
 * slash, so path variants still route by Nitro cannot dodge a rule.
 */
export function normaliseRateLimitPath(path: string): string {
  let normalised = path.split("?")[0] ?? path;
  try {
    normalised = decodeURIComponent(normalised);
  } catch {
    // Malformed encoding: match on the raw path rather than failing open.
  }
  normalised = normalised.replace(/\/{2,}/g, "/");
  if (normalised.length > 1) {
    normalised = normalised.replace(/\/+$/, "");
  }
  return normalised;
}

function findRule(path: string, method: string): RateLimitRule | undefined {
  return rules.find(
    (rule) =>
      (!rule.methods || rule.methods.includes(method)) &&
      rule.endpoints.some((endpoint) =>
        rule.exact ? path === endpoint : path.startsWith(endpoint),
      ),
  );
}

async function readSignInEmail(event: H3Event): Promise<string | null> {
  try {
    const body = await readBody(event);
    const email = (body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" && email.trim() ? email : null;
  } catch {
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const path = normaliseRateLimitPath(event.path);
  const method = event.method;
  const rule = findRule(path, method);
  const isEmailSignIn = method === "POST" && path === "/api/auth/sign-in/email";

  if (!rule && !isEmailSignIn) {
    return;
  }

  // Opportunistic cleanup of long-expired counters (replaces the old
  // in-process setInterval sweep, which cannot exist per-replica).
  if (Math.random() < 0.01) {
    purgeExpiredRateLimits().catch((error) => {
      console.error("rate-limit: purge failed", error);
    });
  }

  if (rule) {
    // Authenticated traffic is keyed per user (stable across NAT / shared
    // egress); unauthenticated traffic per trusted client IP.
    const userId = (event.context.user as { id?: string } | undefined)?.id;
    const scope = userId ? `user:${userId}` : `ip:${getClientIp(event)}`;
    const key = `${scope}:${path}`;

    let hit = null;
    try {
      hit = await hitRateLimit(key, rule.windowMinutes * 60 * 1000);
    } catch (error) {
      // Fail open: the store being unreachable must not take down sign-in.
      console.error("rate-limit: store unavailable, skipping limit", error);
    }

    if (hit && hit.count > rule.maxAttempts) {
      const remainingTime = Math.max(
        1,
        Math.ceil((hit.resetAt.getTime() - Date.now()) / 60000),
      );
      throw createError({
        statusCode: 429,
        message: rule.errorMessage(remainingTime),
      });
    }
  }

  if (isEmailSignIn) {
    const email = await readSignInEmail(event);
    if (!email) return;

    let lockoutMs = 0;
    try {
      lockoutMs = await getAuthLockoutMs(email);
    } catch (error) {
      console.error("rate-limit: lockout check unavailable", error);
    }
    if (lockoutMs > 0) {
      const remainingTime = Math.max(1, Math.ceil(lockoutMs / 60000));
      throw createError({
        statusCode: 429,
        message: `Too many failed sign-in attempts. Please try again in ${remainingTime} minutes.`,
      });
    }

    // Record the attempt outcome once the response is written. Registered only
    // for attempts that were allowed through, so rejected (429) requests do not
    // extend a lockout the legitimate account owner is waiting out.
    // Only credential-shaped rejections (401/403) count as failures: a 400
    // (malformed body) is not an attempt on the account, and 5xx during an
    // incident must not lock users out for retrying once service recovers.
    event.node.res.on("finish", () => {
      const status = event.node.res.statusCode;
      const outcome =
        status === 401 || status === 403
          ? recordAuthFailure(email)
          : status < 300
            ? clearAuthFailures(email)
            : null;
      outcome?.catch((error) => {
        console.error("rate-limit: failed to record sign-in outcome", error);
      });
    });
  }
});
