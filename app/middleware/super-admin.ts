export default defineNuxtRouteMiddleware(async () => {
  // Fetch session directly to avoid race conditions
  const { data: session } = await useFetch("/api/auth/get-session");

  // If user is not authenticated, redirect to login
  if (!session.value?.user) {
    return navigateTo("/login");
  }

  // Check if user is a super admin
  if (!session.value.user.isSuperAdmin) {
    throw createError({
      statusCode: 403,
      message: "Access Denied",
    });
  }
});
