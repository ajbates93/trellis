import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTabLeadership,
  isWebLocksSupported,
  tryWebLock,
  withWebLock,
} from "./webLocks";

/**
 * Minimal LockManager stand-in. Models the two behaviours we depend on:
 * exclusive queueing, and `ifAvailable` handing back a null lock rather than
 * waiting. Ownership passes straight to the next waiter on release so a
 * later caller can't jump the queue.
 */
class FakeLockManager {
  private held = new Set<string>();
  private queues = new Map<string, Array<() => void>>();

  async request(
    name: string,
    optionsOrCallback: LockOptions | ((lock: Lock | null) => unknown),
    maybeCallback?: (lock: Lock | null) => unknown,
  ): Promise<unknown> {
    const options =
      typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const callback = (
      typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback
    )!;

    if (this.held.has(name)) {
      if (options.ifAvailable) return await callback(null);
      await new Promise<void>((resolve) => {
        const queue = this.queues.get(name) ?? [];
        queue.push(resolve);
        this.queues.set(name, queue);
      });
    }

    this.held.add(name);
    try {
      return await callback({ name, mode: "exclusive" } as Lock);
    } finally {
      const next = this.queues.get(name)?.shift();
      if (next) next();
      else this.held.delete(name);
    }
  }

  isHeld(name: string) {
    return this.held.has(name);
  }
}

let fake: FakeLockManager;

const setLocks = (value: unknown) => {
  Object.defineProperty(globalThis.navigator, "locks", {
    value,
    configurable: true,
    writable: true,
  });
};

/** Lets queued lock callbacks and promise chains settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  fake = new FakeLockManager();
  setLocks(fake);
});

afterEach(() => {
  setLocks(undefined);
  vi.restoreAllMocks();
});

describe("isWebLocksSupported", () => {
  it("is true when navigator.locks exists", () => {
    expect(isWebLocksSupported()).toBe(true);
  });

  it("is false when the API is missing", () => {
    setLocks(undefined);
    expect(isWebLocksSupported()).toBe(false);
  });
});

describe("withWebLock", () => {
  it("returns the callback's value", async () => {
    await expect(withWebLock("a", () => "done")).resolves.toBe("done");
  });

  it("serialises concurrent callers on the same name", async () => {
    const events: string[] = [];
    const slow = async (id: string) => {
      events.push(`start:${id}`);
      await flush();
      events.push(`end:${id}`);
    };

    await Promise.all([
      withWebLock("review", () => slow("a")),
      withWebLock("review", () => slow("b")),
    ]);

    // No interleaving: each critical section closes before the next opens.
    expect(events).toEqual(["start:a", "end:a", "start:b", "end:b"]);
  });

  it("allows concurrency across different names", async () => {
    const events: string[] = [];
    await Promise.all([
      withWebLock("one", async () => {
        events.push("start:one");
        await flush();
        events.push("end:one");
      }),
      withWebLock("two", async () => {
        events.push("start:two");
        await flush();
        events.push("end:two");
      }),
    ]);

    expect(events).toEqual(["start:one", "start:two", "end:one", "end:two"]);
  });

  it("releases the lock when the callback throws", async () => {
    await expect(
      withWebLock("a", () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(fake.isHeld("a")).toBe(false);
  });

  it("still runs the callback when the API is unavailable", async () => {
    setLocks(undefined);
    await expect(withWebLock("a", () => "ran")).resolves.toBe("ran");
  });
});

describe("tryWebLock", () => {
  it("resolves null without running the callback when the lock is taken", async () => {
    const callback = vi.fn();
    let release!: () => void;
    const holding = withWebLock(
      "busy",
      () => new Promise<void>((resolve) => (release = resolve)),
    );

    await expect(tryWebLock("busy", callback)).resolves.toBeNull();
    expect(callback).not.toHaveBeenCalled();

    release();
    await holding;
  });

  it("runs the callback when the lock is free", async () => {
    await expect(tryWebLock("free", () => "ran")).resolves.toBe("ran");
  });
});

describe("createTabLeadership", () => {
  it("makes the first caller leader", async () => {
    const changes: boolean[] = [];
    const tab = createTabLeadership("editor", (v) => changes.push(v));
    await flush();

    expect(changes).toEqual([true]);
    tab.dispose();
  });

  it("reports a second tab as follower", async () => {
    const first = createTabLeadership("editor", () => {});
    await flush();

    const changes: boolean[] = [];
    const second = createTabLeadership("editor", (v) => changes.push(v));
    await flush();

    expect(changes).toEqual([false]);
    first.dispose();
    second.dispose();
  });

  it("promotes the follower when the leader disposes", async () => {
    const first = createTabLeadership("editor", () => {});
    await flush();

    const changes: boolean[] = [];
    const second = createTabLeadership("editor", (v) => changes.push(v));
    await flush();
    expect(changes).toEqual([false]);

    first.dispose();
    await flush();

    expect(changes).toEqual([false, true]);
    second.dispose();
  });

  it("does not take the lock if disposed while queued", async () => {
    const first = createTabLeadership("editor", () => {});
    await flush();

    const changes: boolean[] = [];
    const second = createTabLeadership("editor", (v) => changes.push(v));
    await flush();

    second.dispose();
    first.dispose();
    await flush();

    // Never promoted, and nothing left holding the lock behind it.
    expect(changes).toEqual([false]);
    expect(fake.isHeld("editor")).toBe(false);
  });

  it("releases the lock on dispose so a later tab can acquire it", async () => {
    const first = createTabLeadership("editor", () => {});
    await flush();
    first.dispose();
    await flush();

    expect(fake.isHeld("editor")).toBe(false);

    const changes: boolean[] = [];
    const later = createTabLeadership("editor", (v) => changes.push(v));
    await flush();

    expect(changes).toEqual([true]);
    later.dispose();
  });

  it("fails open when the API is unavailable", async () => {
    setLocks(undefined);
    const changes: boolean[] = [];
    const tab = createTabLeadership("editor", (v) => changes.push(v));

    expect(changes).toEqual([true]);
    expect(() => tab.dispose()).not.toThrow();
  });
});
