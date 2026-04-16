import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./stats.get')

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns stats with 6 sequential selects', async () => {
    // 1. total users
    mockSelect([{ count: 10 }])
    // 2. active users (emailVerified = true)
    mockSelect([{ count: 7 }])
    // 3. feedback this week
    mockSelect([{ count: 3 }])
    // 4. total feedback
    mockSelect([{ count: 42 }])
    // 5. active goals
    mockSelect([{ count: 5 }])
    // 6. pending reviews
    mockSelect([{ count: 2 }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({
      totalUsers: 10,
      activeUsers: 7,
      invitedUsers: 3,
      feedbackThisWeek: 3,
      totalFeedback: 42,
      activeGoals: 5,
      pendingReviews: 2,
    })
    expect(mockDb.select).toHaveBeenCalledTimes(6)
  })

  it('computes invitedUsers as totalUsers minus activeUsers', async () => {
    mockSelect([{ count: 20 }])
    mockSelect([{ count: 12 }])
    mockSelect([{ count: 0 }])
    mockSelect([{ count: 0 }])
    mockSelect([{ count: 0 }])
    mockSelect([{ count: 0 }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      totalUsers: 20,
      activeUsers: 12,
      invitedUsers: 8,
    })
  })

  it('returns zeros when all counts are empty', async () => {
    // All six selects return empty arrays (no rows)
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      totalUsers: 0,
      activeUsers: 0,
      invitedUsers: 0,
      feedbackThisWeek: 0,
      totalFeedback: 0,
      activeGoals: 0,
      pendingReviews: 0,
    })
  })

  it('works with an unauthenticated event (no auth check in handler)', async () => {
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])

    const event = createUnauthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      totalUsers: 1,
      activeUsers: 1,
      invitedUsers: 0,
    })
  })

  it('throws 500 when the database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
