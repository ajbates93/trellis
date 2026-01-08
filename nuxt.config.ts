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

  // TODO: Remove this once light mode is ready
  colorMode: {
    preference: "dark",
    fallback: "dark",
  },

  app: {
    head: {
      title: "Trellis",
      titleTemplate: "%s | Trellis",
      htmlAttrs: {
        class: "dark", // TODO: Remove when light mode is ready
      },
      script: [
        // {
        //   src: "https://app.snaggd.io/embed-loader.js",
        //   async: true,
        //   "data-project-key": "e397035f-a300-4af4-b8db-06a80077f144",
        //   "data-theme": "auto",
        //   "data-debug": true,
        // },
      ],
    },
  },
});
