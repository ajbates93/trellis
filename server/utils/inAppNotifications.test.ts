import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";

const { mockDb } = createMockDb();

vi.mock("../database/connection", () => ({ db: mockDb }));

const { createNotification } = await import("./inAppNotifications");

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a notification row for the given user", async () => {
    const insertReturning = vi.fn().mockResolvedValue([{ id: "abc" }]);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    mockDb.insert = vi.fn().mockReturnValue({ values: insertValues });

    await createNotification({
      userId: "user-1",
      type: "feedback_received",
      title: "New feedback from Alex",
      link: "/feedback/inbox",
      metadata: { feedbackId: "fb-1" },
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "feedback_received",
        title: "New feedback from Alex",
        link: "/feedback/inbox",
        metadata: { feedbackId: "fb-1" },
      }),
    );
  });

  it("swallows errors and does not throw (fire-and-forget)", async () => {
    mockDb.insert = vi.fn().mockImplementation(() => {
      throw new Error("db down");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createNotification({
        userId: "user-1",
        type: "feedback_received",
        title: "x",
        link: "/x",
      }),
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
