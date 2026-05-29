import { demoRedirectTarget } from "~/utils/demoRedirect";

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();
  const target = demoRedirectTarget(Boolean(config.public.demoMode), to.path);
  if (target) return navigateTo(target);
});
