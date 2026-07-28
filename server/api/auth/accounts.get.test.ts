import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./accounts.get')

describe('GET /api/auth/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns user accounts', async () => {
    const accounts = [
      { id: 'acc-1', providerId: 'google', accountId: 'google-123', createdAt: new Date() },
    ]
    mockSelect(accounts)

    const event = createMockEvent({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    })
    const result = await handler(event)

    expect(result).toEqual(accounts)
  })
})
