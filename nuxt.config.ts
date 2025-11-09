// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/test-utils",
    "@nuxt/ui",
    "@nuxt/eslint",
    "nuxt-mcp",
    "nuxt-tiptap-editor",
  ],
  css: ["~/assets/css/main.css"],

  tiptap: {
    prefix: "Tiptap", // prefix for Tiptap imports, composables not included
  },

  eslint: {},
});
