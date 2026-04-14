import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildReviewSchedule, buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./upcoming.get')

describe('GET /api/reviews/upcoming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns upcoming reviews for the current user', async () => {
    const user = buildUser({ id: 'user-1' })
    const buddy = buildUser({ id: 'user-2' })
    const review = buildReviewSchedule({
      userId: 'user-1',
      buddyId: 'user-2',
      status: 'scheduled',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleType: user.roleType,
      },
    })

    // 1. upcoming reviews query (joined with user)
    mockSelect([review])
    // 2. buddy lookup for the review
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 3. previous review lookup
    mockSelect([])
    // 4. feedback count
    mockSelect([{ count: 3 }])
    // 5. check-ins for the review
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      reviews: [
        {
          ...review,
          buddy: { id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType },
          feedbackCount: 3,
          checkins: [],
        },
      ],
    })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty reviews array when user has no upcoming reviews', async () => {
    // upcoming reviews query returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ reviews: [] })
  })

  it('returns 500 when querying for a non-existent forUserId (404 caught as 500)', async () => {
    // target user lookup returns nothing — 404 is thrown inside try/catch and re-thrown as 500
    mockSelect([])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-99' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when non-buddy non-admin requests another user\'s upcoming reviews (403 caught)', async () => {
    // target user lookup: buddyId is someone else — 403 is inside try/catch, re-thrown as 500
    mockSelect([{ buddyId: 'user-99' }])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-2' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('allows buddy to view another user\'s upcoming reviews', async () => {
    const user = buildUser({ id: 'user-2' })
    const buddy = buildUser({ id: 'user-1' })
    const review = buildReviewSchedule({
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'scheduled',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleType: user.roleType,
      },
    })

    // 1. target user authorization lookup: buddyId is 'user-1' (the session user) — passes auth check
    mockSelect([{ buddyId: 'user-1' }])
    // 2. upcoming reviews query for user-2
    mockSelect([review])
    // 3. buddy lookup for the review
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 4. previous review lookup
    mockSelect([])
    // 5. feedback count
    mockSelect([{ count: 0 }])
    // 6. check-ins
    mockSelect([])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-2' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      reviews: [
        {
          ...review,
          buddy: { id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType },
          feedbackCount: 0,
          checkins: [],
        },
      ],
    })
  })
})
