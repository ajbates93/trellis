import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildAchievement } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.get')

describe('GET /api/achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns achievements for the current user', async () => {
    const achievement1 = buildAchievement({ userId: 'user-1', achievedDate: '2025-03-01' })
    const achievement2 = buildAchievement({ userId: 'user-1', achievedDate: '2025-01-15' })

    mockSelect([achievement1, achievement2])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ achievements: [achievement1, achievement2] })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns empty achievements array when the user has none', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ achievements: [] })
  })

  it('returns achievements for another user when admin queries by userId', async () => {
    const achievement = buildAchievement({ userId: 'user-99', achievedDate: '2025-02-01' })

    mockSelect([achievement])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-99' },
      session: { user: { id: 'user-1', email: 'admin@example.com', name: 'Admin', role: 'admin' } },
    })
    const result = await handler(event)

    expect(result).toEqual({ achievements: [achievement] })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
