import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((data: unknown) => data),
}));

const { default: handler } = await import("./unread-count.get");

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const event = createUnauthenticatedEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns the count of unread notifications", async () => {
    mockSelect([{ count: 2 }]);
    const event = createAuthenticatedEvent();
    const result = await handler(event);
    expect(result).toEqual({ count: 2 });
  });

  it("returns 0 when there are none", async () => {
    mockSelect([]);
    const event = createAuthenticatedEvent();
    const result = await handler(event);
    expect(result).toEqual({ count: 0 });
  });
});
