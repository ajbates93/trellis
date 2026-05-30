import { createError } from "h3";

/** Single source of truth for whether this deployment is the demo environment. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Throws a 404 (so demo-only routes are invisible) unless DEMO_MODE is on. */
export function assertDemoMode(): void {
  if (!isDemoMode()) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
}
