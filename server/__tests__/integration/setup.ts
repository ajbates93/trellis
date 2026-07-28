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
