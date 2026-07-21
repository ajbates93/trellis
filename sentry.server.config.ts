import * as Sentry from "@sentry/nuxt";

const config = useRuntimeConfig();

Sentry.init({
  dsn: config.public.sentry.dsn,
  environment: config.public.sentry.environment,
  release: config.public.appVersion,

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: config.public.sentry.tracesSampleRate,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
