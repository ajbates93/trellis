import { describe, it, expect, afterEach } from "vitest";
import { createMockEvent } from "#server/__tests__/helpers/mock-event";

const { default: handler } = await import("./login.post");

describe("POST /api/demo/login", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("404s when not in demo mode", async () => {
    const event = createMockEvent();
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });
});
