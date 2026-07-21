// Tests never contact a real database (connection is mocked per-suite), but
// server/database/connection.ts reads DATABASE_URL at import time. Provide a
// harmless default so the suite is green locally without extra env plumbing.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock'
}

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
