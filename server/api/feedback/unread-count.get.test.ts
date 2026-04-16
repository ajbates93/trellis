import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./unread-count.get')

describe('GET /api/feedback/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns count of unread feedback', async () => {
    mockSelect([{ id: '1' }, { id: '2' }, { id: '3' }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ count: 3 })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns 0 when there is no unread feedback', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ count: 0 })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
