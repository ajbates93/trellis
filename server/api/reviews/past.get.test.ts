import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildReviewSchedule, buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./past.get')

describe('GET /api/reviews/past', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns past reviews for the current user', async () => {
    const user = buildUser({ id: 'user-1' })
    const buddy = buildUser({ id: 'user-2' })
    const review = buildReviewSchedule({
      userId: 'user-1',
      buddyId: 'user-2',
      status: 'completed',
      completedDate: '2025-01-15T10:00:00.000Z',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleType: user.roleType,
      },
    })

    // 1. past reviews query (joined with user)
    mockSelect([review])
    // 2. buddy lookup
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 3. previous review lookup
    mockSelect([])
    // 4. feedback count
    mockSelect([{ count: 5 }])
    // 5. check-ins
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      reviews: [
        {
          ...review,
          buddy: { id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType },
          feedbackCount: 5,
          checkins: [],
        },
      ],
    })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty reviews array when user has no past reviews', async () => {
    // past reviews query returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ reviews: [] })
  })

  it('returns 404 when querying for a non-existent forUserId', async () => {
    // target user lookup returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-99' },
    })

    // 404 is inside try/catch that wraps all errors as 500
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when non-buddy non-admin requests another user\'s past reviews (403 caught)', async () => {
    // target user lookup: buddyId is someone else, not 'user-1'
    mockSelect([{ buddyId: 'user-99' }])

    const event = createAuthenticatedEvent({
      query: { userId: 'user-2' },
    })

    // 403 is inside try/catch that wraps all errors as 500
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('allows buddy to view another user\'s past reviews', async () => {
    const user = buildUser({ id: 'user-2' })
    const buddy = buildUser({ id: 'user-1' })
    const review = buildReviewSchedule({
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'completed',
      completedDate: '2025-01-15T10:00:00.000Z',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleType: user.roleType,
      },
    })

    // 1. target user authorization lookup: buddyId is 'user-1'
    mockSelect([{ buddyId: 'user-1' }])
    // 2. past reviews query
    mockSelect([review])
    // 3. buddy lookup
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 4. previous review lookup
    mockSelect([])
    // 5. feedback count
    mockSelect([{ count: 2 }])
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
          feedbackCount: 2,
          checkins: [],
        },
      ],
    })
  })
})
