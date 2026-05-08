import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../../database/connection", () => ({ db: mockDb }));
vi.mock("../../utils/validation", () => ({
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
  validateQuery: vi.fn((event: { query?: Record<string, unknown> }) => ({
    limit: 20,
    filter: "all" as const,
    cursor: undefined,
    ...(event.query ?? {}),
  })),
}));

const { default: handler } = await import("./index.get");

const sample = (overrides: Record<string, unknown> = {}) => ({
  id: "n1",
  userId: "u1",
  type: "feedback_received",
  title: "t",
  body: null,
  link: "/feedback/inbox",
  metadata: {},
  readAt: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  ...overrides,
});

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns items with nextCursor null when fewer than limit", async () => {
    mockSelect([sample()]);
    const event = createAuthenticatedEvent({ query: { limit: "20", filter: "all" } });
    const result = await handler(event);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when result is at limit", async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      sample({ id: `n${i}`, createdAt: new Date(2026, 4, 1, 10, 0, i) }),
    );
    mockSelect(rows);
    const event = createAuthenticatedEvent({ query: { limit: "20", filter: "all" } });
    const result = await handler(event);
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe(rows[19]!.createdAt.toISOString());
  });
});
