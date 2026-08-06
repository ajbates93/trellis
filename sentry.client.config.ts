import * as Sentry from "@sentry/nuxt";

const config = useRuntimeConfig();

Sentry.init({
  dsn: config.public.sentry.dsn,
  environment: config.public.sentry.environment,
  release: config.public.appVersion,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: config.public.sentry.tracesSampleRate,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [Sentry.replayIntegration()],

  // Stale-chunk fetches after a redeploy (hashed chunk names change between
  // builds) are transient and already handled by Nuxt's automatic reload
  // (experimental.emitRouteChunkError defaults to "automatic"); the second
  // message is the Safari/Firefox wording of the same failure.
  ignoreErrors: [
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
