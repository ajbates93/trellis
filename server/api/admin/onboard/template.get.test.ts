import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createAdminEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

// setResponseHeaders is a Nuxt/H3 auto-imported global — stub it
vi.stubGlobal('setResponseHeaders', vi.fn())

const { default: handler } = await import('./template.get')

describe('GET /api/admin/onboard/template', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a CSV string', async () => {
    const event = createAdminEvent()
    const result = await handler(event)

    expect(typeof result).toBe('string')
  })

  it('returns content with CSV header row', async () => {
    const event = createAdminEvent()
    const result = await handler(event) as string

    const firstLine = result.trim().split('\n')[0]
    expect(firstLine).toBe('email,name,roleType,buddyEmail')
  })

  it('returns CSV with at least one example data row', async () => {
    const event = createAdminEvent()
    const result = await handler(event) as string

    const lines = result.trim().split('\n')
    expect(lines.length).toBeGreaterThan(1)
  })

  it('CSV rows contain email addresses', async () => {
    const event = createAdminEvent()
    const result = await handler(event) as string

    const dataLines = result.trim().split('\n').slice(1)
    for (const line of dataLines) {
      if (line.trim()) {
        expect(line).toMatch(/@/)
      }
    }
  })
})
