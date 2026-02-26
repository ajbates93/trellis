import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./activity-summary.get')

describe('GET /api/community/activity-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const event = createUnauthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns zeros when no feedback exists', async () => {
    // Total this week
    mockSelect([{ count: 0 }])
    // Active contributors
    mockSelect([{ count: 0 }])
    // All feedback for streaks
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      totalFeedbackThisWeek: 0,
      activeContributors: 0,
      longestActiveStreak: 0,
      streakHolder: null,
    })
  })

  it('returns correct stats with activity', async () => {
    // Total feedback this week
    mockSelect([{ count: 5 }])
    // Active contributors this week
    mockSelect([{ count: 3 }])
    // All feedback for streaks
    mockSelect([
      { reviewerId: 'user-1', weekYear: '2025-W03' },
      { reviewerId: 'user-1', weekYear: '2025-W04' },
      { reviewerId: 'user-1', weekYear: '2025-W05' },
      { reviewerId: 'user-2', weekYear: '2025-W05' },
    ])
    // Streak holder lookup
    mockSelect([{ name: 'Alice', avatarUrl: null }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.totalFeedbackThisWeek).toBe(5)
    expect(result.activeContributors).toBe(3)
    expect(result.longestActiveStreak).toBe(3)
    expect(result.streakHolder).toMatchObject({ name: 'Alice' })
  })

  it('handles single user workspace', async () => {
    mockSelect([{ count: 1 }])
    mockSelect([{ count: 1 }])
    mockSelect([
      { reviewerId: 'user-1', weekYear: '2025-W05' },
    ])
    mockSelect([{ name: 'Solo User', avatarUrl: null }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.longestActiveStreak).toBe(1)
    expect(result.streakHolder?.name).toBe('Solo User')
  })

  it('throws 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
