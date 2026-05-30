import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

// The middleware imports better-auth (which pulls in the DB connection) and the
// Drizzle connection. Mock both so importing the middleware doesn't require a
// live DATABASE_URL, and so we can assert getSession is NOT called on the
// public/demo bypass paths.
const getSessionMock = vi.fn();
vi.mock("#server/utils/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock("#server/database/connection", () => ({ db: {} }));

const { default: handler } = await import("./auth");

describe("auth middleware - demo route exemption", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue(null);
  });
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("does not 401 the demo login endpoint in demo mode (no session needed)", async () => {
    process.env.DEMO_MODE = "true";
    const event = createMockEvent({ method: "POST", path: "/api/demo/login" });
    await expect(handler(event)).resolves.toBeUndefined();
    // Bypass happens before any session lookup.
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("does not 401 the demo reset endpoint in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const event = createMockEvent({ method: "POST", path: "/api/demo/reset" });
    await expect(handler(event)).resolves.toBeUndefined();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("does not redirect the demo entry page in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const event = createMockEvent({ path: "/demo" });
    await expect(handler(event)).resolves.toBeUndefined();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("still 401s demo API routes when NOT in demo mode (no session)", async () => {
    // DEMO_MODE unset -> the exemption does not apply -> normal auth applies.
    const event = createMockEvent({ method: "POST", path: "/api/demo/reset" });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("still 401s a normal protected API route with no session", async () => {
    const event = createMockEvent({ path: "/api/feedback/received" });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
  });
});
