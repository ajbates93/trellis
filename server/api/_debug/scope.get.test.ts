import { describe, it, expect, vi } from "vitest";
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from "#server/__tests__/helpers/mock-event";

vi.mock("#server/database/connection", () => ({
  getRequestScope: () => ({ db: {} }),
  db: { execute: vi.fn().mockResolvedValue([{ ws: "ws1", sa: "off" }]) },
}));

const { default: handler } = await import("./scope.get");

describe("GET /api/_debug/scope", () => {
  it("rejects a non-super-admin", async () => {
    await expect(handler(createAuthenticatedEvent())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("rejects an unauthenticated request", async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("reports scope state to a super-admin", async () => {
    const event = createAuthenticatedEvent({
      session: {
        user: { id: "sa", email: "sa@x.io", name: "SA", isSuperAdmin: true },
      },
    });
    const result = (await handler(event)) as { scopedInHandler: boolean };
    expect(result.scopedInHandler).toBe(true);
  });
});
