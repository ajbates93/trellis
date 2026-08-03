import {
  defineEventHandler,
  createError,
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus,
  setResponseHeaders,
  getRequestHeader,
  getHeader,
  setHeader,
  setCookie,
  getCookie,
  sendRedirect,
  getHeaders,
  toWebRequest,
  assertMethod,
} from "h3";
import { beforeEach, afterAll } from "vitest";

// Point the app's database connection at the disposable test database. This
// runs during setup-file evaluation, before any test module (and therefore
// server/database/connection.ts, imported dynamically in the hooks below and
// statically by the test files) loads. None of the imports above touch the DB
// connection, so ordering them first is safe.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Handlers under test transitively import modules that construct third-party
// clients at import time (e.g. email.ts does `new Resend(RESEND_API_KEY)`,
// which throws on an empty key). CI's integration job only sets
// TEST_DATABASE_URL, so provide the same harmless mock defaults the unit setup
// does, or those imports fail before any test runs.
const testEnvDefaults: Record<string, string> = {
  RESEND_API_KEY: "re_test_mock_key",
  BETTER_AUTH_SECRET: "mock-secret-key-for-testing-only",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "mock-client-id",
  GOOGLE_CLIENT_SECRET: "mock-client-secret",
};
for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Register h3 auto-imports as globals so endpoint files work outside Nuxt,
// exactly as the unit-test setup does.
Object.assign(globalThis, {
  defineEventHandler,
  createError,
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus,
  setResponseHeaders,
  getRequestHeader,
  getHeader,
  setHeader,
  setCookie,
  getCookie,
  sendRedirect,
  getHeaders,
  toWebRequest,
  assertMethod,
  defineTask: (def: { meta?: unknown; run: (...args: unknown[]) => unknown }) =>
    def,
});

// Each test starts against a clean database. resetDb is imported dynamically so
// this file never statically pulls in the db connection before DATABASE_URL is
// set above.
beforeEach(async () => {
  const { resetDb } = await import("./helpers/harness");
  await resetDb();
});

afterAll(async () => {
  const { client } = await import("./helpers/harness");
  await client.end();
});
