import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: unknown) => data),
}))

const { default: handler } = await import('./dashboard-summary.get')

describe('GET /api/buddies/dashboard-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns empty state when user has no buddees', async () => {
    // 1. Buddees lookup → empty
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      buddees: [],
      totalFeedbackToPublish: 0,
    })
    // No aggregate queries should be issued when there are no buddees
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('aggregates metrics for multiple buddees using 5 queries total, not 4xN', async () => {
    const buddeeA = buildUser({ id: 'buddee-a', name: 'Alice' })
    const buddeeB = buildUser({ id: 'buddee-b', name: 'Bob' })

    // 1. Buddees lookup
    mockSelect([buddeeA, buddeeB])
    // 2. Unpublished feedback grouped by revieweeId
    mockSelect([
      { revieweeId: 'buddee-a', count: 3 },
      { revieweeId: 'buddee-b', count: 1 },
    ])
    // 3. Published feedback grouped by revieweeId
    mockSelect([
      { revieweeId: 'buddee-a', count: 5 },
      // Bob has no published feedback → absent from the grouped result
    ])
    // 4. Active goals grouped by userId
    mockSelect([{ userId: 'buddee-a', count: 2 }])
    // 5. Upcoming reviews for all buddees
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(mockDb.select).toHaveBeenCalledTimes(5)
    expect(result.totalFeedbackToPublish).toBe(4)
    expect(result.buddees).toHaveLength(2)

    const alice = result.buddees.find((b: { id: string }) => b.id === 'buddee-a')!
    expect(alice.feedbackToPublish).toBe(3)
    expect(alice.feedbackReceived).toBe(5)
    expect(alice.activeGoals).toBe(2)

    const bob = result.buddees.find((b: { id: string }) => b.id === 'buddee-b')!
    expect(bob.feedbackToPublish).toBe(1)
    // Bob has no published feedback row → falls back to 0
    expect(bob.feedbackReceived).toBe(0)
    expect(bob.activeGoals).toBe(0)
    // No published feedback → needs_attention
    expect(bob.status).toBe('needs_attention')
  })

  it('derives "review_soon" status when the next review is within 14 days', async () => {
    const buddee = buildUser({ id: 'buddee-1' })

    // Next review 7 days from now
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 7)
    const soonDateStr = soonDate.toISOString().split('T')[0]

    mockSelect([buddee])
    mockSelect([]) // unpublished
    mockSelect([{ revieweeId: 'buddee-1', count: 2 }]) // published
    mockSelect([]) // goals
    mockSelect([{ userId: 'buddee-1', scheduledDate: soonDateStr }]) // upcoming review

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.buddees[0].status).toBe('review_soon')
    expect(result.buddees[0].nextReviewDays).toBeLessThanOrEqual(14)
    expect(result.buddees[0].nextReviewDays).toBeGreaterThan(0)
  })

  it('picks the earliest upcoming review per buddee when multiple are scheduled', async () => {
    const buddee = buildUser({ id: 'buddee-1' })

    const earlier = new Date()
    earlier.setDate(earlier.getDate() + 10)
    const later = new Date()
    later.setDate(later.getDate() + 30)

    mockSelect([buddee])
    mockSelect([])
    mockSelect([{ revieweeId: 'buddee-1', count: 1 }])
    mockSelect([])
    // Already ordered ASC by scheduledDate — handler keeps the first per buddee
    mockSelect([
      { userId: 'buddee-1', scheduledDate: earlier.toISOString().split('T')[0] },
      { userId: 'buddee-1', scheduledDate: later.toISOString().split('T')[0] },
    ])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.buddees[0].nextReviewDate).toBe(earlier.toISOString().split('T')[0])
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch buddy dashboard summary',
    })
  })
})
