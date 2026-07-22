import { describe, it, expect } from 'vitest'

describe('database connection', () => {
  it('throws a clear error when DATABASE_URL is missing', async () => {
    const original = process.env.DATABASE_URL
    try {
      delete process.env.DATABASE_URL
      // Bypass the module cache so the top-level guard re-runs.
      await expect(
        import(`./connection?nocache=${Date.now()}`)
      ).rejects.toThrow(/DATABASE_URL is not set/)
    } finally {
      process.env.DATABASE_URL = original
    }
  })
})
