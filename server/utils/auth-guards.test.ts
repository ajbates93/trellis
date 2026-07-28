import { describe, it, expect } from "vitest";
import { requireUser, requireAdmin, requireSuperAdmin } from "./auth-guards";
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
  createMockEvent,
} from "#server/__tests__/helpers/mock-event";

describe("requireUser", () => {
  it("returns the user from context for an authenticated event", () => {
    const event = createAuthenticatedEvent();
    const user = requireUser(event);
    expect(user.id).toBe("user-1");
  });

  it("falls back to session.user when context.user is unset", () => {
    const event = createMockEvent({
      session: { user: { id: "u9", email: "u9@x.io", name: "U9" } },
    });
    expect(requireUser(event).id).toBe("u9");
  });

  it("throws 401 when there is no session or user", () => {
    const event = createUnauthenticatedEvent();
    expect(() => requireUser(event)).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});

describe("requireAdmin", () => {
  it("returns the user when role is admin", () => {
    const event = createAdminEvent();
    expect(requireAdmin(event).role).toBe("admin");
  });

  it("throws 403 for a non-admin user", () => {
    const event = createAuthenticatedEvent();
    expect(() => requireAdmin(event)).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("throws 403 for a super admin who is not a workspace admin", () => {
    const event = createAuthenticatedEvent({
      session: {
        user: {
          id: "sa1",
          email: "sa1@x.io",
          name: "SA",
          role: "user",
          isSuperAdmin: true,
        },
      },
    });
    expect(() => requireAdmin(event)).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("throws 401 before checking role when unauthenticated", () => {
    const event = createUnauthenticatedEvent();
    expect(() => requireAdmin(event)).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});

describe("requireSuperAdmin", () => {
  it("returns the user when isSuperAdmin is true", () => {
    const event = createAuthenticatedEvent({
      session: {
        user: { id: "sa2", email: "sa2@x.io", name: "SA2", isSuperAdmin: true },
      },
    });
    expect(requireSuperAdmin(event).isSuperAdmin).toBe(true);
  });

  it("throws 403 when isSuperAdmin is not true (workspace admin only)", () => {
    const event = createAdminEvent();
    expect(() => requireSuperAdmin(event)).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
