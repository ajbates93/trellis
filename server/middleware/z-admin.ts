export default defineEventHandler(async (event) => {
  // Only check admin routes under /api/admin/*
  const path = getRequestURL(event).pathname;

  if (!path.startsWith("/api/admin")) {
    return;
  }

  // Check session from event context (set by auth middleware)
  const session = event.context.session;

  // Check if user is authenticated
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Authentication required",
    });
  }

  // Check if user has admin role
  if (session.user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Admin access required",
    });
  }
});
