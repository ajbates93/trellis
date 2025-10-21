// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/test-utils", "@nuxt/ui", "@nuxt/eslint", "nuxt-mcp"],
  css: ["~/assets/css/main.css"],

  ui: {
    icons: {
      // Only use heroicons, disable lucide
      collections: ["heroicons"],
    },
  },
});

