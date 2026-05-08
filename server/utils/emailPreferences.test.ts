import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "#server/__tests__/helpers/mock-db";

const { mockDb, mockSelect } = createMockDb();

vi.mock("../database/connection", () => ({ db: mockDb }));

const { shouldEmail } = await import("./emailPreferences");

describe("shouldEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when preferences are missing the category (default on)", async () => {
    mockSelect([{ emailNotificationPreferences: {} }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(true);
  });

  it("returns false when category explicitly set to false", async () => {
    mockSelect([{ emailNotificationPreferences: { feedback_received: false } }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(false);
  });

  it("returns true when category explicitly set to true", async () => {
    mockSelect([{ emailNotificationPreferences: { feedback_received: true } }]);
    expect(await shouldEmail("u1", "feedback_received")).toBe(true);
  });

  it("returns true when user has null preferences", async () => {
    mockSelect([{ emailNotificationPreferences: null }]);
    expect(await shouldEmail("u1", "review_reminder")).toBe(true);
  });

  it("returns false when user not found", async () => {
    mockSelect([]);
    expect(await shouldEmail("missing", "feedback_received")).toBe(false);
  });
});
