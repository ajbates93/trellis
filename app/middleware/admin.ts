export default defineNuxtRouteMiddleware(async (to, from) => {
  // Use the auth composable to get user session
  const { user } = useAuth();

  // Check if user has admin role
  if (user.value?.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have permission to access this page. Admin privileges are required.',
    });
  }
});
