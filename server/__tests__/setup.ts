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
} from 'h3'

// Tests never contact a real database (connection is mocked per-suite), but
// server/database/connection.ts reads DATABASE_URL at import time. Provide a
// harmless default so the suite is green locally without extra env plumbing.
// (Set after imports to satisfy import/first; setupFiles run fully before any
// test module imports the connection.)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock'
}

// Some modules construct third-party clients at import time (e.g. email.ts does
// `new Resend(process.env.RESEND_API_KEY)`, which throws on an empty key), and
// better-auth reads its secret/OAuth config when the auth instance is built.
// Tests that import the real modules (rather than mocking them) would otherwise
// fail purely on missing env. Provide harmless mock defaults, same as above.
const testEnvDefaults: Record<string, string> = {
  RESEND_API_KEY: 're_test_mock_key',
  BETTER_AUTH_SECRET: 'mock-secret-key-for-testing-only',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'mock-client-id',
  GOOGLE_CLIENT_SECRET: 'mock-client-secret',
}
for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

// Register h3 auto-imports as globals so endpoint files work outside Nuxt context
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
  // Nitro auto-import: defineTask is just an identity function in tests
  defineTask: (def: { meta?: unknown; run: (...args: unknown[]) => unknown }) => def,
})
