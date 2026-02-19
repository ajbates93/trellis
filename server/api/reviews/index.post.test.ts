import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildReviewSchedule } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when creating a review for yourself', async () => {
    // session user id is 'user-1' by default
    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-1',
        scheduledDate: '2099-03-01T10:00:00.000Z',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'You cannot create a review for yourself',
    })
  })

  it('returns 404 when target user does not exist', async () => {
    // select returns empty — target user not found
    mockSelect([])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-99',
        scheduledDate: '2099-03-01T10:00:00.000Z',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    })
  })

  it('returns 403 when current user is not the buddy of the target user', async () => {
    // buddyId on target user is someone else, not 'user-1'
    mockSelect([{ buddyId: 'user-99' }])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-2',
        scheduledDate: '2099-03-01T10:00:00.000Z',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You can only create reviews for users you are a buddy of',
    })
  })

  it('returns 400 when scheduled date is in the past', async () => {
    // buddyId matches session user 'user-1'
    mockSelect([{ buddyId: 'user-1' }])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-2',
        scheduledDate: '2000-01-01T00:00:00.000Z',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Scheduled date and time must be in the future',
    })
  })

  it('creates a review successfully', async () => {
    const newReview = buildReviewSchedule({
      userId: 'user-2',
      buddyId: 'user-1',
      scheduledDate: '2099-03-01T10:00:00.000Z',
      name: 'March 2099',
      status: 'scheduled',
    })

    // select: target user lookup
    mockSelect([{ buddyId: 'user-1' }])
    // insert: new review
    mockInsert([newReview])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-2',
        scheduledDate: '2099-03-01T10:00:00.000Z',
        name: 'March 2099',
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: newReview })
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('auto-generates a name when not provided', async () => {
    const newReview = buildReviewSchedule({
      userId: 'user-2',
      buddyId: 'user-1',
      scheduledDate: '2099-03-01T10:00:00.000Z',
      name: 'March 2099',
    })

    mockSelect([{ buddyId: 'user-1' }])
    mockInsert([newReview])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-2',
        scheduledDate: '2099-03-01T10:00:00.000Z',
        // name intentionally omitted
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: newReview })
    expect(mockDb.insert).toHaveBeenCalled()
  })
})
