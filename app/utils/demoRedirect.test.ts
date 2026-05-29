import { describe, it, expect } from "vitest";
import { demoRedirectTarget } from "./demoRedirect";

describe("demoRedirectTarget", () => {
  it("redirects '/' to '/demo' in demo mode", () => {
    expect(demoRedirectTarget(true, "/")).toBe("/demo");
  });
  it("does not redirect '/' outside demo mode", () => {
    expect(demoRedirectTarget(false, "/")).toBeNull();
  });
  it("does not redirect the demo page itself (avoids a loop)", () => {
    expect(demoRedirectTarget(true, "/demo")).toBeNull();
  });
  it("does not redirect other paths", () => {
    expect(demoRedirectTarget(true, "/dashboard")).toBeNull();
  });
});
