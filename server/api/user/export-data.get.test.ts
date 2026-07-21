import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { users, feedback, goals as goalsTable, reviewSchedules, buddyCheckins, achievements as achievementsTable } from '#server/database/schema'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./export-data.get')

describe('GET /api/user/export-data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns the caller own data scoped by session user id, with attachment header', async () => {
    const profile = { id: 'user-1', email: 'test@example.com', name: 'Test User' }
    const feedbackGiven = [{ id: 'fb-1', reviewerId: 'user-1', revieweeId: 'user-2' }]
    const feedbackReceived = [{ id: 'fb-2', reviewerId: 'user-2', revieweeId: 'user-1' }]
    const goals = [{ id: 'goal-1', userId: 'user-1' }]
    const reviews = [{ id: 'review-1', userId: 'user-1' }]
    const checkins = [{ id: 'checkin-1', userId: 'user-1' }]
    const achievements = [{ id: 'ach-1', userId: 'user-1' }]

    // Queue selects in handler order: profile, feedbackGiven, feedbackReceived,
    // goals, reviews, checkins, achievements
    const profileChain = mockSelect([profile])
    const feedbackGivenChain = mockSelect(feedbackGiven)
    const feedbackReceivedChain = mockSelect(feedbackReceived)
    const goalsChain = mockSelect(goals)
    const reviewsChain = mockSelect(reviews)
    const checkinsChain = mockSelect(checkins)
    const achievementsChain = mockSelect(achievements)

    const event = createAuthenticatedEvent({ session: { user: { id: 'user-1' } as any } })

    const result = await handler(event)

    // 7 scoped queries: profile, feedbackGiven, feedbackReceived, goals,
    // reviews, checkins, achievements. Removing a query entirely would drop
    // this count.
    expect(mockDb.select).toHaveBeenCalledTimes(7)

    // Each query must be scoped with a .where(...) clause - if a `.where(...)`
    // is removed from the handler, the corresponding chain's `where` spy
    // is never called and this fails.
    const chains = [
      { chain: profileChain, table: users },
      { chain: feedbackGivenChain, table: feedback },
      { chain: feedbackReceivedChain, table: feedback },
      { chain: goalsChain, table: goalsTable },
      { chain: reviewsChain, table: reviewSchedules },
      { chain: checkinsChain, table: buddyCheckins },
      { chain: achievementsChain, table: achievementsTable },
    ]

    for (const { chain, table } of chains) {
      expect(chain.from).toHaveBeenCalledTimes(1)
      expect(chain.from).toHaveBeenCalledWith(table)
      expect(chain.where).toHaveBeenCalledTimes(1)
      expect(chain.where.mock.calls[0]![0]).toBeDefined()
    }

    expect(result).toMatchObject({
      profile,
      feedbackGiven,
      feedbackReceived,
      goals,
      reviews,
      checkins,
      achievements,
    })
    expect(result).toHaveProperty('exportedAt')
    expect(typeof (result as any).exportedAt).toBe('string')

    expect(event.node.res.getHeader('content-type')).toBe('application/json')
    expect(event.node.res.getHeader('content-disposition')).toBe(
      'attachment; filename="trellis-export-user-1.json"'
    )
  })
})
