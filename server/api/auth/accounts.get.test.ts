import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import { createMockEvent } from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

const { default: handler } = await import('./accounts.get')
const { auth } = await import('../../utils/auth')

describe('GET /api/auth/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any)

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns user accounts', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any)

    const accounts = [
      { id: 'acc-1', providerId: 'google', accountId: 'google-123', createdAt: new Date() },
    ]
    mockSelect(accounts)

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual(accounts)
  })
})
