import { describe, it, expect } from "vitest";
import handler from "./rate-limit";
import { createIntegrationEvent } from "#server/__tests__/integration/helpers/harness";
import {
  getAuthLockoutMs,
  recordAuthFailure,
  AUTH_FAILURE_THRESHOLD,
} from "#server/utils/rate-limit-store";

// Real middleware + real Postgres store: reproduces the auditor's bypass
// (vary X-Forwarded-For per request) and proves it no longer works, plus the
// path-variant and per-account lockout behaviour end to end (F5).

interface LimiterEventOptions {
  path: string;
  method?: string;
  xff?: string;
  body?: unknown;
  user?: Record<string, unknown>;
}

function limiterEvent(options: LimiterEventOptions) {
  const event = createIntegrationEvent({
    method: options.method ?? "POST",
    path: options.path,
    body: options.body,
    user: options.user,
  });
  if (options.xff) {
    event.node.req.headers["x-forwarded-for"] = options.xff;
  }
  return event;
}

describe("rate-limit middleware (integration, real store)", () => {
  it("blocks the auditor's bypass: a unique X-Forwarded-For per request no longer resets the bucket", async () => {
    // 5 allowed attempts, each with a different spoofed leftmost entry. With
    // one trusted hop the last entry (appended by our proxy) keys the bucket,
    // so all 6 land in the same counter and the 6th is rejected.
    for (let i = 1; i <= 5; i++) {
      const event = limiterEvent({
        path: "/api/auth/sign-in",
        xff: `${i}.${i}.${i}.${i}, 203.0.113.7`,
      });
      await expect(handler(event)).resolves.toBeUndefined();
    }
    const sixth = limiterEvent({
      path: "/api/auth/sign-in",
      xff: "99.99.99.99, 203.0.113.7",
    });
    await expect(handler(sixth)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("counts path variants (doubled slash, trailing slash) into the same bucket", async () => {
    const variants = [
      "/api/auth/sign-in",
      "//api/auth/sign-in",
      "/api/auth/sign-in/",
      "/api//auth/sign-in",
      "/api/auth/sign-in",
    ];
    for (const path of variants) {
      const event = limiterEvent({ path, xff: "1.2.3.4" });
      await expect(handler(event)).resolves.toBeUndefined();
    }
    const blocked = limiterEvent({ path: "//api/auth//sign-in/", xff: "1.2.3.4" });
    await expect(handler(blocked)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("keeps different real clients in different buckets", async () => {
    for (let i = 1; i <= 5; i++) {
      await handler(limiterEvent({ path: "/api/auth/sign-in", xff: "203.0.113.7" }));
    }
    // A different trusted-hop address is a different client: not throttled.
    const other = limiterEvent({ path: "/api/auth/sign-in", xff: "198.51.100.9" });
    await expect(handler(other)).resolves.toBeUndefined();
  });

  it("throttles POST /api/feedback per user", async () => {
    const user = { id: "feedback-user", workspaceId: "ws-1" };
    for (let i = 1; i <= 20; i++) {
      const event = limiterEvent({ path: "/api/feedback", user, body: {} });
      await expect(handler(event)).resolves.toBeUndefined();
    }
    const blocked = limiterEvent({ path: "/api/feedback", user, body: {} });
    await expect(handler(blocked)).rejects.toMatchObject({ statusCode: 429 });

    // A different user is not affected.
    const otherUser = limiterEvent({
      path: "/api/feedback",
      user: { id: "someone-else" },
      body: {},
    });
    await expect(handler(otherUser)).resolves.toBeUndefined();
  });

  it("rejects sign-in for a locked account regardless of source IP", async () => {
    for (let i = 0; i < AUTH_FAILURE_THRESHOLD; i++) {
      await recordAuthFailure("victim@example.com");
    }
    expect(await getAuthLockoutMs("victim@example.com")).toBeGreaterThan(0);

    // Fresh IP every attempt - the account lockout still applies.
    const event = limiterEvent({
      path: "/api/auth/sign-in/email",
      xff: "8.8.8.8",
      body: { email: "victim@example.com", password: "guess" },
    });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("records failures via the response outcome and locks after the threshold", async () => {
    for (let i = 0; i < AUTH_FAILURE_THRESHOLD; i++) {
      const event = limiterEvent({
        // Unique spoofed IP per attempt so the per-IP rule does not trip first;
        // this test exercises the account counter specifically.
        path: "/api/auth/sign-in/email",
        xff: `10.1.1.${i + 1}`,
        body: { email: "target@example.com", password: "wrong" },
      });
      await expect(handler(event)).resolves.toBeUndefined();
      // Simulate better-auth rejecting the credentials.
      event.node.res.statusCode = 401;
      event.node.res.emit("finish");
      // The finish listener records asynchronously.
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(await getAuthLockoutMs("target@example.com")).toBeGreaterThan(0);
  });

  it("clears the streak on a successful sign-in", async () => {
    for (let i = 0; i < AUTH_FAILURE_THRESHOLD - 1; i++) {
      await recordAuthFailure("recovers@example.com");
    }

    const event = limiterEvent({
      path: "/api/auth/sign-in/email",
      xff: "10.2.2.2",
      body: { email: "recovers@example.com", password: "right" },
    });
    await expect(handler(event)).resolves.toBeUndefined();
    event.node.res.statusCode = 200;
    event.node.res.emit("finish");
    await new Promise((r) => setTimeout(r, 20));

    // Streak cleared: threshold-1 new failures still do not lock.
    for (let i = 0; i < AUTH_FAILURE_THRESHOLD - 1; i++) {
      await recordAuthFailure("recovers@example.com");
    }
    expect(await getAuthLockoutMs("recovers@example.com")).toBe(0);
  });
});
