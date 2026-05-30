import { auth } from "#server/utils/auth";
import { db } from "#server/database/connection";
import { workspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { isDemoMode } from "#server/utils/demo";

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes
  const publicRoutes = [
    "/api/auth",
    "/api/health",
    "/api/integrations/slack/commands", // Slack slash commands (signature verified)
    "/api/integrations/slack/interactions", // Slack modal interactions (signature verified)
    "/api/integrations/slack/callback", // OAuth callback
    "/api/marketing/", // Demo request form
    "/login",
    "/landing", // legacy marketing path, redirects to /
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
    // No session found - redirect to login for pages, 401 for API
    if (path.startsWith("/api/")) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    } else if (path !== "/login") {
      return sendRedirect(event, "/login");
    }
  }

  // Attach user to event context
  event.context.user = session?.user;
  event.context.session = session;

  // Attach workspace to event context if user has one
  if (session?.user?.workspaceId) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, session.user.workspaceId))
      .limit(1);

    event.context.workspace = workspace || null;
  }
});
