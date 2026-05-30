import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

vi.mock("#server/database/seed-demo", () => ({ seedDemo: vi.fn() }));

const { default: handler } = await import("./reset.post");

describe("POST /api/demo/reset", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_RESET_SECRET;
    vi.clearAllMocks();
  });

  it("404s when not in demo mode", async () => {
    const event = createMockEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("403s when the secret is wrong", async () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_RESET_SECRET = "right";
    const event = createMockEvent({ headers: { "x-demo-secret": "wrong" } });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("403s when DEMO_RESET_SECRET is not configured", async () => {
    process.env.DEMO_MODE = "true";
    // DEMO_RESET_SECRET deliberately absent
    const event = createMockEvent({ headers: { "x-demo-secret": "anything" } });
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("resets when the secret matches", async () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_RESET_SECRET = "right";
    const event = createMockEvent({ headers: { "x-demo-secret": "right" } });
    const result = await handler(event);
    expect(result).toMatchObject({ ok: true });
  });
});
