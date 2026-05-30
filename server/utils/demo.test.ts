import { describe, it, expect, afterEach } from "vitest";
import { isDemoMode, assertDemoMode } from "./demo";

describe("demo helpers", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("isDemoMode is false when DEMO_MODE is unset", () => {
    expect(isDemoMode()).toBe(false);
  });

  it("isDemoMode is true only for the exact string 'true'", () => {
    process.env.DEMO_MODE = "true";
    expect(isDemoMode()).toBe(true);
    process.env.DEMO_MODE = "1";
    expect(isDemoMode()).toBe(false);
  });

  it("assertDemoMode throws a 404 when not in demo mode", () => {
    expect(() => assertDemoMode()).toThrowError(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it("assertDemoMode is a no-op in demo mode", () => {
    process.env.DEMO_MODE = "true";
    expect(() => assertDemoMode()).not.toThrow();
  });
});
