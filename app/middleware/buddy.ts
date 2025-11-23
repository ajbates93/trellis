/**
 * Middleware to protect buddy-specific routes
 * Redirects users without any assigned buddies away from /buddies/* routes
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to /buddies/* routes
  if (!to.path.startsWith("/buddies")) {
    return;
  }

  const { hasBuddies, pending } = useBuddies();

  // Wait for buddy data to load
  if (pending.value) {
    await new Promise((resolve) => {
      const unwatch = watch(pending, (value) => {
        if (!value) {
          unwatch();
          resolve(undefined);
        }
      });
    });
  }

  // If user has no buddies, redirect to dashboard
  if (!hasBuddies.value) {
    return navigateTo("/");
  }
});
