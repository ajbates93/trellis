export default defineNuxtRouteMiddleware(async () => {
  // Fetch session directly to avoid race conditions
  const { data: session } = await useApi("/auth/get-session");

  const user = (session.value as { user?: { isSuperAdmin?: boolean } } | null)
    ?.user;

  // If user is not authenticated, redirect to login
  if (!user) {
    return navigateTo("/login");
  }

  // Check if user is a super admin
  if (!user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: "Access Denied",
    });
  }
});
