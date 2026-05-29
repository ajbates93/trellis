/** Returns the path to redirect to, or null to allow navigation. */
export function demoRedirectTarget(
  demoMode: boolean,
  path: string,
): string | null {
  if (demoMode && path === "/") return "/demo";
  return null;
}
