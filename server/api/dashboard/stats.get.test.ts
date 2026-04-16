import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser, buildFeedback, buildReviewSchedule } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockSelectDistinct } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./stats.get')

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 500 when user is not found (createError inside try/catch wraps to 500)', async () => {
    // 1. user lookup returns empty
    mockSelect([])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns dashboard stats with all counts and no upcoming review', async () => {
    const user = buildUser({ id: 'user-1' })
    const feedbackGiven = [buildFeedback({ reviewerId: 'user-1' })]
    const feedbackGivenLastWeek = [buildFeedback({ reviewerId: 'user-1' })]
    const feedbackReceived = [buildFeedback({ revieweeId: 'user-1', published: true })]
    const feedbackReceivedLastWeek: unknown[] = []
    const upcomingReviews: unknown[] = []

    // Queries in order:
    // 1. Get current user
    mockSelect([user])
    // 2. Feedback given this week
    mockSelect(feedbackGiven)
    // 3. Feedback given last week
    mockSelect(feedbackGivenLastWeek)
    // 4. Feedback received this week (published)
    mockSelect(feedbackReceived)
    // 5. Feedback received last week (published)
    mockSelect(feedbackReceivedLastWeek)
    // 6. Upcoming reviews
    mockSelect(upcomingReviews)
    // 7. Feedback streak week rows (selectDistinct)
    mockSelectDistinct([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      feedbackGiven: 1,
      feedbackReceived: 1,
      daysUntilReview: null,
      feedbackStreak: 0,
    })
    expect(typeof result.feedbackGivenTrend).toBe('number')
    expect(typeof result.feedbackReceivedTrend).toBe('number')
    expect(typeof result.feedbackStreak).toBe('number')
    expect(result.feedbackStreak).toBeGreaterThanOrEqual(0)
    expect(mockDb.select).toHaveBeenCalledTimes(6)
    expect(mockDb.selectDistinct).toHaveBeenCalledTimes(1)
  })

  it('calculates daysUntilReview when an upcoming review exists', async () => {
    const user = buildUser({ id: 'user-1' })

    // Put review date 10 days in the future
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const review = buildReviewSchedule({
      userId: 'user-1',
      status: 'scheduled',
      scheduledDate: futureDateStr,
    })

    mockSelect([user])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([review])
    mockSelectDistinct([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.daysUntilReview).not.toBeNull()
    expect(result.daysUntilReview).toBeGreaterThan(0)
  })

  it('calculates trend correctly when previous week had no feedback', async () => {
    const user = buildUser({ id: 'user-1' })

    mockSelect([user])
    // Given this week: 2, given last week: 0 → trend should be 100
    mockSelect([buildFeedback(), buildFeedback()])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelectDistinct([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.feedbackGiven).toBe(2)
    expect(result.feedbackGivenTrend).toBe(100)
  })

  it('computes feedbackStreak from persisted weekYear rows, including an ISO year boundary', async () => {
    const user = buildUser({ id: 'user-1' })

    mockSelect([user])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    // Three consecutive ISO weeks spanning the 2024 → 2025 boundary.
    // computeStreak sorts/dedupes internally, so order here doesn't matter.
    mockSelectDistinct([
      { weekYear: '2024-W52' },
      { weekYear: '2025-W01' },
      { weekYear: '2025-W02' },
    ])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.feedbackStreak).toBe(3)
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch dashboard stats',
    })
  })
})
