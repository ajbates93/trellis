import { auth } from "../utils/auth";
import { db } from "../database/connection";
import { workspaces } from "../database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes
  const publicRoutes = ["/api/auth", "/api/health", "/login"];
  const path = event.path;

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
