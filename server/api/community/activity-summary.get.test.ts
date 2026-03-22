import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockSelectDistinct } = createMockDb()

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
    // feedbackSubmitted
    mockSelect([{ count: 0 }])
    // previousPeriodCount
    mockSelect([{ count: 0 }])
    // active contributors
    mockSelect([{ count: 0 }])
    // total workspace users
    mockSelect([{ count: 5 }])
    // unique pairs (outer select wraps selectDistinct subquery)
    mockSelectDistinct([])
    mockSelect([{ count: 0 }])
    // period feedback (for mostConnected)
    mockSelect([])
    // all feedback (for streaks)
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      feedbackSubmitted: 0,
      previousPeriodCount: 0,
      periodChange: 0,
      participationRate: { active: 0, total: 5 },
      uniquePairs: 0,
      longestActiveStreak: 0,
      streakHolder: null,
      mostConnected: null,
    })
  })

  it('returns correct stats with activity', async () => {
    // feedbackSubmitted
    mockSelect([{ count: 5 }])
    // previousPeriodCount
    mockSelect([{ count: 3 }])
    // active contributors
    mockSelect([{ count: 3 }])
    // total workspace users
    mockSelect([{ count: 10 }])
    // unique pairs (outer select wraps selectDistinct subquery)
    mockSelectDistinct([])
    mockSelect([{ count: 4 }])
    // period feedback (for mostConnected)
    mockSelect([
      { reviewerId: 'user-1', revieweeId: 'user-2' },
      { reviewerId: 'user-1', revieweeId: 'user-3' },
      { reviewerId: 'user-2', revieweeId: 'user-1' },
    ])
    // mostConnected user lookup
    mockSelect([{ name: 'User One', avatarUrl: null }])
    // all feedback (for streaks)
    mockSelect([
      { reviewerId: 'user-1', weekYear: '2025-W03' },
      { reviewerId: 'user-1', weekYear: '2025-W04' },
      { reviewerId: 'user-1', weekYear: '2025-W05' },
      { reviewerId: 'user-2', weekYear: '2025-W05' },
    ])
    // streak holder lookup
    mockSelect([{ name: 'Alice', avatarUrl: null }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.feedbackSubmitted).toBe(5)
    expect(result.periodChange).toBe(2)
    expect(result.participationRate).toEqual({ active: 3, total: 10 })
    expect(result.uniquePairs).toBe(4)
    expect(result.longestActiveStreak).toBe(3)
    expect(result.streakHolder).toMatchObject({ name: 'Alice' })
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
