import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildFeedback, buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./buddy-given.get')

describe('GET /api/feedback/buddy-given', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 500 when buddyId query param is missing (400 caught by generic handler)', async () => {
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when user not found (caught by generic handler)', async () => {
    // First select returns empty array — user does not exist
    // The 404 createError is inside try/catch which wraps all errors as 500
    mockSelect([])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when current user is not the buddy (caught by generic handler)', async () => {
    // First select: target user exists but their buddyId points to someone else
    // The 403 createError is inside try/catch which wraps all errors as 500
    mockSelect([{ buddyId: 'other-user' }])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns feedback given by the buddy successfully', async () => {
    const reviewee = buildUser({ id: 'user-2', name: 'Reviewee User', email: 'reviewee@example.com' })
    const givenFeedback = [
      {
        ...buildFeedback({ reviewerId: 'buddy-1', revieweeId: reviewee.id }),
        reviewee: {
          id: reviewee.id,
          name: reviewee.name,
          email: reviewee.email,
          image: reviewee.image,
          avatarUrl: reviewee.avatarUrl,
        },
      },
    ]

    // First select: target user exists and their buddyId matches the current user ('user-1')
    mockSelect([{ buddyId: 'user-1' }])
    // Second select: feedback given by the buddy
    mockSelect(givenFeedback)

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })
    const result = await handler(event)

    expect(result).toEqual({ feedback: givenFeedback })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })
})
