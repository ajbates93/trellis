export default defineNuxtRouteMiddleware(async (to, from) => {
  // Fetch session directly to avoid race conditions
  const { data: session } = await useFetch('/api/auth/get-session');

  // Check if user is admin
  if (!session.value?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have permission to access this page. Admin privileges are required.',
    });
  }
});
