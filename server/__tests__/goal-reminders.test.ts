import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "./helpers/mock-db";

const { mockDb, mockSelect } = createMockDb();

vi.mock("#server/database/connection", () => ({ db: mockDb }));

const createNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("#server/utils/inAppNotifications", () => ({ createNotification }));

const { default: task } = await import("#server/tasks/goal-reminders");

const today = new Date("2026-05-08T09:00:00Z");
const fmt = (d: Date) => d.toISOString().slice(0, 10);

describe("goal-reminders task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(today);
  });

  it("emits goal_approaching when target_date is exactly 7 days away", async () => {
    const sevenOut = new Date(today);
    sevenOut.setDate(sevenOut.getDate() + 7);

    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship feature", targetDate: fmt(sevenOut) }]);
    mockSelect([]); // overdue list (empty → existing-overdue lookup is skipped)
    await task.run({} as never);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_approaching", userId: "u1" }),
    );
  });

  it("emits goal_overdue once per goal even if cron runs again", async () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Run 1: approaching=[], overdue=[g1], existing-overdue-notifs=[]
    mockSelect([]);
    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship", targetDate: fmt(yesterday) }]);
    mockSelect([]);

    await task.run({} as never);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "goal_overdue", userId: "u1" }),
    );

    // Run 2: same data, but now an existing overdue notif exists for g1
    createNotification.mockClear();
    mockSelect([]);
    mockSelect([{ id: "g1", userId: "u1", goalText: "Ship", targetDate: fmt(yesterday) }]);
    mockSelect([{ goalId: "g1" }]);

    await task.run({} as never);
    expect(createNotification).not.toHaveBeenCalled();
  });
});
