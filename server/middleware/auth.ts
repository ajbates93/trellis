import { auth } from "../utils/auth";

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes
  const publicRoutes = ["/api/auth", "/login"];
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
});
