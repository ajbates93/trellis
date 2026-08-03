import { sql } from "drizzle-orm";
import { db } from "#server/database/connection";
import { rateLimits } from "#server/database/schema";

// Postgres-backed rate-limit counters (F5). A single shared table means the
// limits survive restarts and hold across Railway replicas, unlike the old
// in-process object store. All mutations are single atomic upserts so
// concurrent requests on different replicas cannot race a counter.

export interface RateLimitHit {
  count: number;
  resetAt: Date;
}

/**
 * Record one hit against `key` and return the updated counter. If the
 * previous window has expired the counter restarts at 1 with a fresh window.
 */
export async function hitRateLimit(
  key: string,
  windowMs: number,
): Promise<RateLimitHit> {
  const now = new Date().toISOString();
  const resetAt = new Date(Date.now() + windowMs).toISOString();
  const rows = await db.execute<{ count: number; reset_at: Date | string }>(sql`
    insert into ${rateLimits} ("key", "count", "reset_at")
    values (${key}, 1, ${resetAt}::timestamptz)
    on conflict ("key") do update set
      "count" = case when ${rateLimits.resetAt} < ${now}::timestamptz then 1 else ${rateLimits.count} + 1 end,
      "reset_at" = case when ${rateLimits.resetAt} < ${now}::timestamptz then excluded."reset_at" else ${rateLimits.resetAt} end
    returning "count", "reset_at"
  `);
  const [row] = Array.from(rows as Iterable<{ count: number; reset_at: Date | string }>);
  if (!row) throw new Error("rate-limit upsert returned no row");
  return { count: Number(row.count), resetAt: new Date(row.reset_at) };
}

/** Current counter for `key`, or null when absent or expired. */
export async function getRateLimit(key: string): Promise<RateLimitHit | null> {
  const now = new Date().toISOString();
  const rows = await db.execute<{ count: number; reset_at: Date | string }>(sql`
    select "count", "reset_at" from ${rateLimits}
    where "key" = ${key} and "reset_at" >= ${now}::timestamptz
  `);
  const [row] = Array.from(rows as Iterable<{ count: number; reset_at: Date | string }>);
  if (!row) return null;
  return { count: Number(row.count), resetAt: new Date(row.reset_at) };
}

/** Drop the counter for `key` (e.g. after a successful sign-in). */
export async function clearRateLimit(key: string): Promise<void> {
  await db.execute(sql`delete from ${rateLimits} where "key" = ${key}`);
}

// ---------------------------------------------------------------------------
// Per-account authentication-failure counter with exponential backoff (F5).
// Keyed on the sign-in identifier so throttling does not depend on IP alone:
// a distributed credential-stuffing run against one account is still locked
// out even when every attempt arrives from a fresh address.
// ---------------------------------------------------------------------------

/** Free failures before lockouts start. */
export const AUTH_FAILURE_THRESHOLD = 5;
/** How long a failure streak is remembered without new failures. */
export const AUTH_FAILURE_DECAY_MS = 30 * 60 * 1000;
/** First lockout duration; doubles per failure past the threshold. */
export const AUTH_LOCKOUT_BASE_MS = 60 * 1000;
/** Lockout ceiling. */
export const AUTH_LOCKOUT_MAX_MS = 60 * 60 * 1000;

// Two rows per account: the failure streak (with its decay window) and the
// active lockout (whose reset_at is the unlock time). Kept separate because a
// short lockout must not be extended by the longer streak-decay window, and
// the streak must outlive an expired lockout so repeat offenders escalate.
function failureKey(identifier: string): string {
  return `auth-fail:${identifier.trim().toLowerCase()}`;
}

function lockKey(identifier: string): string {
  return `auth-lock:${identifier.trim().toLowerCase()}`;
}

/**
 * Record a failed authentication attempt for `identifier`. Past the free
 * threshold each additional failure extends the lockout exponentially
 * (1 min, 2 min, 4 min, ... capped at 1 hour).
 */
export async function recordAuthFailure(identifier: string): Promise<void> {
  const { count } = await hitRateLimit(failureKey(identifier), AUTH_FAILURE_DECAY_MS);
  if (count >= AUTH_FAILURE_THRESHOLD) {
    const lockoutMs = Math.min(
      AUTH_LOCKOUT_BASE_MS * 2 ** (count - AUTH_FAILURE_THRESHOLD),
      AUTH_LOCKOUT_MAX_MS,
    );
    const lockedUntil = new Date(Date.now() + lockoutMs).toISOString();
    // greatest() so a concurrent longer lockout is never shortened.
    await db.execute(sql`
      insert into ${rateLimits} ("key", "count", "reset_at")
      values (${lockKey(identifier)}, 1, ${lockedUntil}::timestamptz)
      on conflict ("key") do update set
        "reset_at" = greatest(${rateLimits.resetAt}, excluded."reset_at")
    `);
  }
}

/**
 * Milliseconds until `identifier` may attempt authentication again, or 0 when
 * it is not locked out.
 */
export async function getAuthLockoutMs(identifier: string): Promise<number> {
  const entry = await getRateLimit(lockKey(identifier));
  if (!entry) return 0;
  return Math.max(0, entry.resetAt.getTime() - Date.now());
}

/** Clear the failure streak and any lockout after a successful authentication. */
export async function clearAuthFailures(identifier: string): Promise<void> {
  await clearRateLimit(failureKey(identifier));
  await clearRateLimit(lockKey(identifier));
}

/**
 * Opportunistically purge long-expired counters so the table does not grow
 * unbounded (replaces the old in-process setInterval sweep). Called with a
 * small probability from the middleware; any error is the caller's to ignore.
 */
export async function purgeExpiredRateLimits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.execute(sql`delete from ${rateLimits} where "reset_at" < ${cutoff}::timestamptz`);
}
