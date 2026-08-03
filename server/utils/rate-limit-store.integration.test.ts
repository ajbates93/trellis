import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "#server/__tests__/integration/helpers/harness";
import {
  hitRateLimit,
  getRateLimit,
  clearRateLimit,
  recordAuthFailure,
  getAuthLockoutMs,
  clearAuthFailures,
  purgeExpiredRateLimits,
  AUTH_FAILURE_THRESHOLD,
} from "./rate-limit-store";

// The store IS the security control for F5: these run the real SQL against a
// real Postgres, proving counters are shared state (per-process memory was the
// audited weakness) and that the atomic upsert counts correctly.
describe("rate-limit store (integration, real DB)", () => {
  it("increments atomically under concurrent hits", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => hitRateLimit("ip:1.2.3.4:/x", 60000)),
    );
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    // Every hit must land: 10 concurrent upserts yield exactly 1..10.
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("restarts the counter when the window has expired", async () => {
    await hitRateLimit("k", 60000);
    // Force-expire the row, as if the window elapsed.
    await db.execute(
      sql`update rate_limits set reset_at = now() - interval '1 second' where key = 'k'`,
    );
    const hit = await hitRateLimit("k", 60000);
    expect(hit.count).toBe(1);
    expect(hit.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("persists counters outside process memory (visible to a fresh reader)", async () => {
    await hitRateLimit("shared", 60000);
    await hitRateLimit("shared", 60000);
    // getRateLimit issues its own query - stands in for another replica.
    const entry = await getRateLimit("shared");
    expect(entry?.count).toBe(2);
  });

  it("clearRateLimit drops the counter", async () => {
    await hitRateLimit("gone", 60000);
    await clearRateLimit("gone");
    expect(await getRateLimit("gone")).toBeNull();
  });

  describe("per-account auth failure counter", () => {
    it("does not lock before the threshold", async () => {
      for (let i = 0; i < AUTH_FAILURE_THRESHOLD - 1; i++) {
        await recordAuthFailure("a@example.com");
      }
      expect(await getAuthLockoutMs("a@example.com")).toBe(0);
    });

    it("locks at the threshold and backs off exponentially", async () => {
      for (let i = 0; i < AUTH_FAILURE_THRESHOLD; i++) {
        await recordAuthFailure("b@example.com");
      }
      const firstLock = await getAuthLockoutMs("b@example.com");
      expect(firstLock).toBeGreaterThan(0);
      expect(firstLock).toBeLessThanOrEqual(60 * 1000);

      // Two more failures double the lockout twice (1min -> 4min).
      await recordAuthFailure("b@example.com");
      await recordAuthFailure("b@example.com");
      const laterLock = await getAuthLockoutMs("b@example.com");
      expect(laterLock).toBeGreaterThan(2 * 60 * 1000);
      expect(laterLock).toBeLessThanOrEqual(4 * 60 * 1000);
    });

    it("treats the identifier case-insensitively", async () => {
      for (let i = 0; i < AUTH_FAILURE_THRESHOLD; i++) {
        await recordAuthFailure("Mixed@Example.com");
      }
      expect(await getAuthLockoutMs("mixed@example.com")).toBeGreaterThan(0);
    });

    it("clears streak and lockout on success", async () => {
      for (let i = 0; i < AUTH_FAILURE_THRESHOLD; i++) {
        await recordAuthFailure("c@example.com");
      }
      expect(await getAuthLockoutMs("c@example.com")).toBeGreaterThan(0);
      await clearAuthFailures("c@example.com");
      expect(await getAuthLockoutMs("c@example.com")).toBe(0);
      // The streak is gone too: one new failure does not re-lock.
      await recordAuthFailure("c@example.com");
      expect(await getAuthLockoutMs("c@example.com")).toBe(0);
    });
  });

  it("purges only long-expired counters", async () => {
    await hitRateLimit("fresh", 60000);
    await db.execute(sql`
      insert into rate_limits (key, count, reset_at)
      values ('stale', 3, now() - interval '2 days')
    `);
    await purgeExpiredRateLimits();
    const keys = await db.execute<{ key: string }>(sql`select key from rate_limits`);
    const names = Array.from(keys as Iterable<{ key: string }>).map((r) => r.key);
    expect(names).toContain("fresh");
    expect(names).not.toContain("stale");
  });
});
