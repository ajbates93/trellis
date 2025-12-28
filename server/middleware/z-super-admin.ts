export default defineEventHandler(async (event) => {
  // Only check super admin routes under /api/super-admin/*
  const path = getRequestURL(event).pathname;

  if (!path.startsWith("/api/super-admin")) {
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

  // Check if user is a super admin
  if (!session.user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Super admin access required",
    });
  }
});
