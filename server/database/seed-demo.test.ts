import { describe, it, expect, afterEach } from "vitest";
import { seedDemo } from "./seed-demo";

describe("seedDemo guard", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("refuses to run unless DEMO_MODE is true", async () => {
    delete process.env.DEMO_MODE;
    await expect(seedDemo()).rejects.toThrow(/DEMO_MODE/);
  });
});
