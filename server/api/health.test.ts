import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

// health.ts uses db.execute() directly, so we mock it differently
const mockExecute = vi.fn()
vi.mock('../database/connection', () => ({
  db: {
    execute: mockExecute,
  },
}))

// health.ts also uses setResponseStatus (H3 global)
const mockSetResponseStatus = vi.fn()
vi.stubGlobal('setResponseStatus', mockSetResponseStatus)

const { default: handler } = await import('./health')

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy status when the database is reachable', async () => {
    mockExecute.mockResolvedValueOnce([{ '?column?': 1 }])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      status: 'healthy',
      database: {
        status: 'connected',
      },
    })
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('uptime')
    expect(result).toHaveProperty('responseTime')
    expect(result).toHaveProperty('version')
    expect(result).toHaveProperty('environment')
    expect(mockSetResponseStatus).not.toHaveBeenCalled()
  })

  it('returns unhealthy status and sets 503 when the database is unreachable', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection refused'))

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      status: 'unhealthy',
      database: {
        status: 'disconnected',
        error: 'Connection refused',
      },
    })
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('uptime')
    expect(result).toHaveProperty('version')
    expect(result).toHaveProperty('environment')
    expect(mockSetResponseStatus).toHaveBeenCalledWith(event, 503)
  })

  it('returns "Unknown error" in database error field when a non-Error is thrown', async () => {
    mockExecute.mockRejectedValueOnce('string error')

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.database.error).toBe('Unknown error')
    expect(result.status).toBe('unhealthy')
  })

  it('does not require authentication (no session check)', async () => {
    mockExecute.mockResolvedValueOnce([])

    // No session at all - should still work
    const event = createMockEvent({ session: null })
    const result = await handler(event)

    expect(result.status).toBe('healthy')
  })
})
