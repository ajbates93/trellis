/**
 * Global admin-group guard.
 *
 * Any page placed under `pages/(admin)/` inherits this check automatically,
 * thanks to Nuxt 4.3's route group meta exposure (`to.meta.groups`).
 *
 * Performs both auth and admin-role checks so individual admin pages don't
 * need to declare `middleware: ["auth", "admin"]`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.meta.groups?.includes("admin")) return;

  const { data: session } = await useApi("/auth/get-session");

  const user = (session.value as { user?: { role?: string } } | null)?.user;

  if (!user) {
    return navigateTo("/login");
  }

  if (user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
      message:
        "You do not have permission to access this page. Admin privileges are required.",
    });
  }
});
