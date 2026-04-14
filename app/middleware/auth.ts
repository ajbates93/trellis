export default defineNuxtRouteMiddleware(async (to, from) => {
  // Fetch session directly to avoid race conditions
  const { data: session } = await useApi('/auth/get-session');

  // If user is not authenticated, redirect to login
  if (!session.value?.user) {
    return navigateTo('/login');
  }
});
