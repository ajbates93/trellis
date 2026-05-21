import { defineEventHandler } from "h3";

const APEX_HOST = "jointrellis.app";
const APP_HOST = "my.jointrellis.app";

// Paths that only make sense on the apex (marketing)
const MARKETING_PATHS = ["/landing"];

// Path prefixes that belong to the product app
const APP_PATH_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/feedback",
  "/goals",
  "/reviews",
  "/buddies",
  "/submit",
  "/notifications",
  "/insights",
  "/brag-bucket",
  "/settings",
  "/admin",
];

function isAppPath(path: string): boolean {
  return APP_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

function isMarketingPath(path: string): boolean {
  return MARKETING_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const host = event.node.req.headers.host;
  if (!host) {
    return;
  }

  const path = event.path;

  // API requests are host-agnostic - never redirect
  if (path.startsWith("/api/")) {
    return;
  }

  if (host === APEX_HOST) {
    if (isAppPath(path)) {
      return sendRedirect(event, `https://${APP_HOST}${path}`, 302);
    }
    return;
  }

  if (host === APP_HOST) {
    // Root on the app host always means the dashboard (auth middleware bounces to /login if no session)
    if (path === "/") {
      return sendRedirect(event, `https://${APP_HOST}/dashboard`, 302);
    }
    // Legacy marketing-only paths belong on the apex
    if (isMarketingPath(path)) {
      return sendRedirect(event, `https://${APEX_HOST}${path}`, 302);
    }
    return;
  }

  // Unknown host - do nothing
});
