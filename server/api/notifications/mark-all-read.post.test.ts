import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb, mockUpdate } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((data: unknown) => data),
}));

const { default: handler } = await import("./mark-all-read.post");

describe("POST /api/notifications/mark-all-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("returns the number of rows updated", async () => {
    mockUpdate([{ id: "n1" }, { id: "n2" }]);

    const result = await handler(createAuthenticatedEvent());
    expect(result).toEqual({ success: true, updated: 2 });
  });

  it("returns 0 when there are no unread notifications", async () => {
    mockUpdate([]);

    const result = await handler(createAuthenticatedEvent());
    expect(result).toEqual({ success: true, updated: 0 });
  });
});
