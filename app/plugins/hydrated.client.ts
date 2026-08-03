/**
 * Releases the dev-only anti-FOUC guard (see the `$development` head style in
 * nuxt.config.ts) once the client app has mounted.
 *
 * This lives in a plugin rather than app.vue because Nuxt bypasses app.vue
 * when it renders error.vue on a full page load - the flag still has to be
 * set there or the error page stays hidden behind the boot bar forever.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    document.body.classList.add("hydrated");
  });
});
