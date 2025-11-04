export default defineNuxtRouteMiddleware(async (to, from) => {
  // Use the auth composable to get user session
  const { user } = useAuth();

  // If user is not authenticated, redirect to login
  if (!user.value) {
    return navigateTo('/login');
  }
});
