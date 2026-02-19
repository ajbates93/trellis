// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxt/test-utils",
    "@nuxt/ui",
    "@nuxt/eslint",
    // "nuxt-mcp", // disabled: requires nuxi peer dep not available in Nuxt 4
    "nuxt-tiptap-editor",
    "@sentry/nuxt/module",
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

  runtimeConfig: {
    // Server-side only (private)
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    slackClientId: process.env.SLACK_CLIENT_ID || "",
    slackClientSecret: process.env.SLACK_CLIENT_SECRET || "",
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",

    public: {
      baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      appVersion: process.env.npm_package_version || "0.0.0",
      sentry: {
        dsn: "", // Set via NUXT_PUBLIC_SENTRY_DSN in production
        environment: process.env.NODE_ENV || "development",
      },
    },
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

  nitro: {
    ignore: ["**/*.test.ts"],
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "0 9 * * *": ["review-reminders"], // Daily at 9 AM UTC
    },
  },

  sentry: {
    org: "alex-bates",
    project: "trellis",
  },

  sourcemap: {
    client: "hidden",
  },
});