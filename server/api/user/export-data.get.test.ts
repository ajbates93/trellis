import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

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
    mockSelect([profile])
    mockSelect(feedbackGiven)
    mockSelect(feedbackReceived)
    mockSelect(goals)
    mockSelect(reviews)
    mockSelect(checkins)
    mockSelect(achievements)

    const event = createAuthenticatedEvent({ session: { user: { id: 'user-1' } as any } })

    const result = await handler(event)

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
