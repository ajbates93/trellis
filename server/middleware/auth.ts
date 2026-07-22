import { auth } from "#server/utils/auth";
import { db } from "#server/database/connection";
import { workspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { isDemoMode } from "#server/utils/demo";

// Protected product-app page prefixes. A logged-out visitor to one of these is
// sent to /login. Anything NOT listed here (and not public) falls through to
// Nuxt, so a genuinely unknown URL renders the 404 page instead of bouncing to
// login. Keep in rough sync with the app's real routes under app/pages.
const PROTECTED_APP_PREFIXES = [
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
  "/profile",
  "/workspaces",
];

function isProtectedAppPath(path: string): boolean {
  return PROTECTED_APP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes (APIs + genuinely public pages).
  const publicRoutes = [
    "/api/auth",
    "/api/health",
    "/api/integrations/slack/commands", // Slack slash commands (signature verified)
    "/api/integrations/slack/interactions", // Slack modal interactions (signature verified)
    "/api/integrations/slack/callback", // OAuth callback
    "/api/marketing/", // Demo request form
    "/login",
    "/landing", // legacy marketing path, redirects to /
    "/privacy", // public legal page
    "/terms", // public legal page
    "/set-password", // invitation flow (invited users are logged out)
    "/reset-password", // password reset flow
    "/forgot-password", // password reset request
  ];
  const path = event.path;

  // Marketing homepage at apex root is public.
  // On the app subdomain the hostname middleware redirects / to /dashboard before this runs.
  if (path === "/") {
    return;
  }

  // Demo environment only: the entry page and demo-only API endpoints are
  // public. They self-guard (DEMO_MODE for both, plus a shared secret for
  // reset), and /api/demo/login must be reachable before any session exists.
  // Gated on demo mode so production keeps these locked down.
  if (isDemoMode() && (path === "/demo" || path.startsWith("/api/demo/"))) {
    return;
  }

  if (publicRoutes.some((route) => path.startsWith(route))) {
    return;
  }

  // Get session from Better-auth
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session) {
    // No session:
    // - API routes -> 401 (the client handles it)
    // - Known protected pages -> redirect to login (with returnTo so the user
    //   lands back where they meant to go after signing in)
    // - Anything else (unknown URLs, public pages) -> fall through, so Nuxt
    //   renders the 404 page rather than bouncing every bad URL to login.
    if (path.startsWith("/api/")) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    } else if (isProtectedAppPath(path)) {
      return sendRedirect(event, `/login?returnTo=${encodeURIComponent(path)}`);
    }
  }

  // Attach user to event context
  event.context.user = session?.user;
  event.context.session = session;

  // Attach workspace to event context if user has one.
  // better-auth's static session type omits additionalFields like workspaceId.
  const workspaceId = (session?.user as { workspaceId?: string | null } | undefined)
    ?.workspaceId;
  if (workspaceId) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    event.context.workspace = workspace || null;
  }
});
