import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNotification } from "#server/utils/inAppNotifications"
import { sendEmail } from "#server/utils/email"
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildReviewSchedule } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock("#server/utils/inAppNotifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("#server/utils/emailPreferences", () => ({
  shouldEmail: vi.fn().mockResolvedValue(true),
}))
vi.mock("#server/utils/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    reviewCreated: vi.fn(() => "<html></html>"),
  },
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
    // select: reviewee lookup (for notification)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // select: buddy lookup (for notification)
    mockSelect([{ name: 'User One', preferredName: null }])

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

  it('emits in-app notification and email on review creation', async () => {
    const newReview = buildReviewSchedule({
      userId: 'user-2',
      buddyId: 'user-1',
      scheduledDate: '2099-03-01T10:00:00.000Z',
      name: 'March 2099',
      status: 'scheduled',
    })

    // select: target user lookup (buddy validation)
    mockSelect([{ buddyId: 'user-1' }])
    // insert: new review
    mockInsert([newReview])
    // select: reviewee lookup (for notification)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // select: buddy lookup (for notification)
    mockSelect([{ name: 'User One', preferredName: null }])

    const event = createAuthenticatedEvent({
      body: {
        userId: 'user-2',
        scheduledDate: '2099-03-01T10:00:00.000Z',
        name: 'March 2099',
      },
    })

    await handler(event)

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'review_created' }),
    )
    expect(sendEmail).toHaveBeenCalled()
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
    // select: reviewee lookup (for notification)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // select: buddy lookup (for notification)
    mockSelect([{ name: 'User One', preferredName: null }])

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
