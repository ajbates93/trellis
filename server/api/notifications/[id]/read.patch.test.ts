import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((d: unknown) => d),
}))

const { default: handler } = await import('./read.patch')

describe('PATCH /api/notifications/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { id: 'n1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when id missing', async () => {
    const event = createAuthenticatedEvent({ params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('marks the notification read for the current user', async () => {
    mockUpdate([{ id: 'n1', readAt: new Date() }])

    const result = await handler(
      createAuthenticatedEvent({ params: { id: 'n1' } })
    )

    expect(result).toEqual({ success: true })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
