import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../database/connection", () => ({
  db: mockDb,
  // Pass-through: run the callback directly so the insert lands on mockDb.
  withWorkspace: (_ctx: unknown, fn: () => unknown) => fn(),
}));

const { createNotification } = await import("./inAppNotifications");

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a notification row stamped with the recipient's workspace", async () => {
    // The recipient's workspace is looked up when not supplied.
    mockSelect([{ workspaceId: "ws-1" }]);
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
        workspaceId: "ws-1",
        type: "feedback_received",
        title: "New feedback from Alex",
        link: "/feedback/inbox",
        metadata: { feedbackId: "fb-1" },
      }),
    );
  });

  it("uses an explicitly supplied workspaceId without a lookup", async () => {
    const insertValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    mockDb.insert = vi.fn().mockReturnValue({ values: insertValues });

    await createNotification({
      userId: "user-1",
      workspaceId: "ws-explicit",
      type: "feedback_received",
      title: "x",
      link: "/x",
    });

    // No recipient lookup performed.
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", workspaceId: "ws-explicit" }),
    );
  });

  it("swallows errors and does not throw (fire-and-forget)", async () => {
    mockSelect([{ workspaceId: "ws-1" }]);
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
