import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import handler, { normaliseRateLimitPath } from "./rate-limit";
import {
  hitRateLimit,
  getAuthLockoutMs,
  recordAuthFailure,
  clearAuthFailures,
} from "#server/utils/rate-limit-store";

vi.mock("#server/utils/rate-limit-store", () => ({
  hitRateLimit: vi.fn(),
  getAuthLockoutMs: vi.fn().mockResolvedValue(0),
  recordAuthFailure: vi.fn().mockResolvedValue(undefined),
  clearAuthFailures: vi.fn().mockResolvedValue(undefined),
  purgeExpiredRateLimits: vi.fn().mockResolvedValue(undefined),
}));

const mockHit = vi.mocked(hitRateLimit);
const mockLockout = vi.mocked(getAuthLockoutMs);

interface MockEventOptions {
  path: string;
  method?: string;
  xff?: string;
  user?: { id: string };
  body?: unknown;
}

function makeEvent(options: MockEventOptions) {
  const res = new EventEmitter() as EventEmitter & { statusCode: number };
  res.statusCode = 200;
  const event = {
    path: options.path,
    method: options.method ?? "GET",
    context: { user: options.user },
    node: {
      req: {
        method: options.method ?? "GET",
        headers: options.xff ? { "x-forwarded-for": options.xff } : {},
        socket: { remoteAddress: "10.0.0.9" },
      },
      res,
    },
    // readBody(event) consults event._requestBody in the mocked h3 setup;
    // the middleware only reads `email` from the parsed body.
    _requestBody: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    web: undefined,
  };
  return { event: event as never, res };
}

describe("normaliseRateLimitPath", () => {
  it("collapses repeated slashes", () => {
    expect(normaliseRateLimitPath("//api/auth//sign-in")).toBe("/api/auth/sign-in");
  });

  it("strips the query string", () => {
    expect(normaliseRateLimitPath("/api/auth/sign-in?next=/x")).toBe("/api/auth/sign-in");
  });

  it("strips trailing slashes", () => {
    expect(normaliseRateLimitPath("/api/auth/sign-in/")).toBe("/api/auth/sign-in");
  });

  it("decodes percent-encoding, then collapses", () => {
    expect(normaliseRateLimitPath("/%2Fapi/auth/sign-in")).toBe("/api/auth/sign-in");
  });

  it("keeps a malformed encoding rather than failing open", () => {
    expect(normaliseRateLimitPath("/api/auth/sign-in%")).toBe("/api/auth/sign-in%");
  });
});

describe("rate-limit middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLockout.mockResolvedValue(0);
  });

  it("does nothing for unmatched paths", async () => {
    const { event } = makeEvent({ path: "/api/goals" });
    await expect(handler(event)).resolves.toBeUndefined();
    expect(mockHit).not.toHaveBeenCalled();
  });

  it("limits a matched path once attempts exceed the maximum", async () => {
    mockHit.mockResolvedValue({ count: 6, resetAt: new Date(Date.now() + 60000) });
    const { event } = makeEvent({ path: "/api/auth/sign-in", method: "POST" });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("matches path variants with doubled slashes", async () => {
    mockHit.mockResolvedValue({ count: 6, resetAt: new Date(Date.now() + 60000) });
    const { event } = makeEvent({ path: "//api/auth/sign-in", method: "POST" });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("keys unauthenticated requests on the trusted client IP, not the spoofable entry", async () => {
    mockHit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) });
    const { event } = makeEvent({
      path: "/api/auth/sign-in",
      method: "POST",
      xff: "6.6.6.6, 203.0.113.7",
    });
    await handler(event);
    expect(mockHit).toHaveBeenCalledWith(
      "ip:203.0.113.7:/api/auth/sign-in",
      15 * 60 * 1000,
    );
  });

  it("throttles POST /api/feedback keyed per authenticated user", async () => {
    mockHit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) });
    const { event } = makeEvent({
      path: "/api/feedback",
      method: "POST",
      user: { id: "user-1" },
    });
    await handler(event);
    expect(mockHit).toHaveBeenCalledWith("user:user-1:/api/feedback", 60 * 60 * 1000);
  });

  it("does not throttle GET /api/feedback/received", async () => {
    const { event } = makeEvent({ path: "/api/feedback/received" });
    await handler(event);
    expect(mockHit).not.toHaveBeenCalled();
  });

  it("rejects a locked-out account before better-auth runs", async () => {
    mockHit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) });
    mockLockout.mockResolvedValue(4 * 60 * 1000);
    const { event } = makeEvent({
      path: "/api/auth/sign-in/email",
      method: "POST",
      body: { email: "victim@example.com", password: "x" },
    });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 });
    expect(mockLockout).toHaveBeenCalledWith("victim@example.com");
  });

  it("records a failure when the sign-in response is an error", async () => {
    mockHit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) });
    const { event, res } = makeEvent({
      path: "/api/auth/sign-in/email",
      method: "POST",
      body: { email: "victim@example.com", password: "x" },
    });
    await handler(event);
    res.statusCode = 401;
    res.emit("finish");
    await new Promise((r) => setTimeout(r, 0));
    expect(recordAuthFailure).toHaveBeenCalledWith("victim@example.com");
    expect(clearAuthFailures).not.toHaveBeenCalled();
  });

  it("clears the failure streak when sign-in succeeds", async () => {
    mockHit.mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60000) });
    const { event, res } = makeEvent({
      path: "/api/auth/sign-in/email",
      method: "POST",
      body: { email: "victim@example.com", password: "x" },
    });
    await handler(event);
    res.statusCode = 200;
    res.emit("finish");
    await new Promise((r) => setTimeout(r, 0));
    expect(clearAuthFailures).toHaveBeenCalledWith("victim@example.com");
    expect(recordAuthFailure).not.toHaveBeenCalled();
  });

  it("fails open when the store is unavailable", async () => {
    mockHit.mockRejectedValue(new Error("db down"));
    const { event } = makeEvent({ path: "/api/marketing/demo-request", method: "POST" });
    await expect(handler(event)).resolves.toBeUndefined();
  });
});
