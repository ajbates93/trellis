/**
 * Thin, SSR-safe helpers over the Web Locks API.
 *
 * Web Locks coordinate across tabs, iframes and workers of the same origin
 * *within a single browser profile*. They are not a distributed lock and are
 * no substitute for server-side constraints — what they buy us is protection
 * against the one-user-two-tabs case, which is precisely where our
 * client-side auto-save guards (debounce timers, AbortControllers) stop
 * working: those are scoped to a single JS context.
 *
 * Every helper fails open. Where the API is unavailable (SSR, older browsers)
 * the work still runs, just without cross-tab coordination.
 */

export function isWebLocksSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "locks" in navigator &&
    navigator.locks != null
  );
}

/**
 * Runs `fn` while holding an exclusive lock on `name`. Concurrent callers in
 * other tabs queue rather than interleave.
 */
export async function withWebLock<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  if (!isWebLocksSupported()) return await fn();
  return (await navigator.locks.request(name, async () => await fn())) as T;
}

/**
 * Runs `fn` only if the lock is free right now, otherwise resolves to null
 * without waiting. Useful for "exactly one tab should do this" work that
 * isn't worth queueing (polling, a shared connection, a one-off toast).
 */
export async function tryWebLock<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<T | null> {
  if (!isWebLocksSupported()) return await fn();
  return (await navigator.locks.request(
    name,
    { ifAvailable: true },
    async (lock) => (lock ? await fn() : null),
  )) as T | null;
}

export interface TabLeadership {
  /** Releases the lock (if held) and stops trying to acquire it. */
  dispose: () => void;
}

/**
 * Elects this tab as the single owner of `name`, calling `onChange` whenever
 * leadership changes.
 *
 * Resolution is deliberately two-step so callers never flash a "someone else
 * has this" state on a normal single-tab load:
 *
 *   1. Probe with `ifAvailable`, which settles in a microtask either way.
 *   2. If another tab owns the lock, report follower and queue a *blocking*
 *      request. When that tab closes or navigates away the browser releases
 *      its lock, our queued request is granted, and we're promoted.
 *
 * Because the browser reclaims locks when a context dies, there is no stale
 * lock to clean up — a crashed or force-closed leader hands over on its own.
 */
export function createTabLeadership(
  name: string,
  onChange: (isLeader: boolean) => void,
): TabLeadership {
  if (!isWebLocksSupported()) {
    // Without the API we can't detect other tabs, so behave as though this is
    // the only one rather than locking the user out of their own page.
    onChange(true);
    return { dispose: () => {} };
  }

  let disposed = false;
  let releaseHeld: (() => void) | null = null;

  // Holding the lock means returning a promise that stays pending for as long
  // as we want it; resolving that promise is what releases the lock.
  const hold = (lock: Lock | null): Promise<void> | undefined => {
    if (!lock || disposed) return undefined;
    onChange(true);
    return new Promise<void>((resolve) => {
      releaseHeld = () => {
        releaseHeld = null;
        resolve();
      };
    });
  };

  const queueForPromotion = () => {
    if (disposed) return;
    navigator.locks.request(name, hold).catch(() => {});
  };

  navigator.locks
    .request(name, { ifAvailable: true }, (lock) => {
      if (lock) return hold(lock);
      onChange(false);
      return undefined;
    })
    .then(() => {
      // When the probe won the lock this only settles on release (i.e. from
      // dispose), where re-queuing would be pointless. Reaching here with no
      // held lock means the probe found it taken, so wait our turn.
      if (!disposed && releaseHeld === null) queueForPromotion();
    })
    .catch(() => {});

  return {
    dispose: () => {
      disposed = true;
      releaseHeld?.();
    },
  };
}
