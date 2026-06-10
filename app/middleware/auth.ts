export default defineNuxtRouteMiddleware(async () => {
  // Fetch session directly to avoid race conditions
  const { data: session } = await useApi('/auth/get-session');

  const user = (session.value as { user?: object } | null)?.user;

  // If user is not authenticated, redirect to login
  if (!user) {
    return navigateTo('/login');
  }
});
