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

  // Pre-bundle icons into the client chunk so client-side navigation (e.g.
  // logout → /login) doesn't flash blank icons while the icon module resolves.
  icon: {
    clientBundle: {
      scan: true,
    },
  },

  eslint: {},

  // Light mode prototype in progress — allow toggling via system preference
  // or the Nuxt UI color-mode picker. Default still favours dark.
  colorMode: {
    preference: "system",
    fallback: "dark",
  },

  runtimeConfig: {
    // Server-side only (private)
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    slackClientId: process.env.SLACK_CLIENT_ID || "",
    slackClientSecret: process.env.SLACK_CLIENT_SECRET || "",
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",
    slackTokenEncryptionKey: process.env.SLACK_TOKEN_ENCRYPTION_KEY || "",

    public: {
      baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      appVersion: process.env.npm_package_version || "0.0.0",
      plausibleToken: process.env.NUXT_PUBLIC_PLAUSIBLE_TOKEN || "",
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
      style: [
        {
          innerHTML: "body:not(.hydrated) { opacity: 0; }",
        },
      ],
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/icon.svg",
        },
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/manifest.webmanifest",
        },
      ],
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

  vite: {
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "@vueuse/core",
        "better-auth/vue",
        "better-auth/client/plugins",
        "date-fns",
        "date-fns-tz",
        "zod",
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "@sentry/nuxt",
        "@unovis/vue",
        "@tiptap/vue-3",
        "@tiptap/starter-kit",
        "@tiptap/extension-task-list",
        "@tiptap/extension-task-item",
        "tiptap-markdown",
      ],
    },
  },

  nitro: {
    ignore: ["**/*.test.ts"],
    routeRules: {
      "/**": {
        headers: {
          "X-Frame-Options": "SAMEORIGIN",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io; frame-ancestors 'none'",
        },
      },
    },
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "0 9 * * *": ["review-reminders", "goal-reminders"], // Daily at 9 AM UTC
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

