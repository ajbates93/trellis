import {
  createTabLeadership,
  isWebLocksSupported,
  tryWebLock,
  withWebLock,
  type TabLeadership,
} from "~/utils/webLocks";

/**
 * Web Locks helpers for coordinating work across a user's open tabs.
 *
 * See `~/utils/webLocks` for the semantics — in short: same origin, same
 * browser profile, fails open where unsupported.
 */
export const useWebLock = () => ({
  withLock: withWebLock,
  tryLock: tryWebLock,
  isSupported: isWebLocksSupported(),
});

/**
 * Marks this tab as the sole owner of `name` for as long as it is mounted.
 *
 * `isLeader` starts true and is corrected within a microtask if another tab
 * already owns the lock, so a single-tab load never flashes a blocked state.
 * If the current leader goes away this tab is promoted automatically.
 *
 * Beyond guarding editors, this is the standard way to elect one tab to own a
 * shared resource — a poller, or a single SSE connection fanned out over
 * BroadcastChannel — without relying on SharedWorker.
 */
export const useLeaderTab = (name: string) => {
  // Default to true so SSR and first paint render as editable.
  const isLeader = ref(true);
  let leadership: TabLeadership | null = null;

  onMounted(() => {
    leadership = createTabLeadership(name, (leader) => {
      isLeader.value = leader;
    });
  });

  onScopeDispose(() => {
    leadership?.dispose();
    leadership = null;
  });

  return { isLeader: readonly(isLeader), isSupported: isWebLocksSupported() };
};
