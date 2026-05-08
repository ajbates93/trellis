import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
}));

const { default: handler } = await import("./notification-preferences.patch");

describe("PATCH /api/user/notification-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("updates user preferences and returns success", async () => {
    const where = vi.fn().mockResolvedValue([]);
    const setFn = vi.fn().mockReturnValue({ where });
    mockDb.update = vi.fn().mockReturnValue({ set: setFn });

    const result = await handler(
      createAuthenticatedEvent({ body: { preferences: { feedback_received: false } } }),
    );
    expect(result).toEqual({ success: true });
    expect(setFn).toHaveBeenCalledWith({
      emailNotificationPreferences: { feedback_received: false },
    });
  });
});
