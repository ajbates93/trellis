import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNotification } from "#server/utils/inAppNotifications"
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildReviewSchedule } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
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
    reviewRescheduled: vi.fn(() => "<html></html>"),
    reviewCancelled: vi.fn(() => "<html></html>"),
    reviewCompleted: vi.fn(() => "<html></html>"),
  },
}))

const { default: handler } = await import('./index.patch')

describe('PATCH /api/reviews/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'review-1' },
      body: { name: 'Updated Name' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when review is not found', async () => {
    // existing review lookup returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'review-99' },
      body: { name: 'Updated Name' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Review not found',
    })
  })

  it('returns 403 when user is neither reviewee, buddy, nor admin', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-3',
    })

    // existing review lookup — 'user-1' is neither reviewee nor buddy
    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { name: 'Updated Name' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You do not have permission to edit this review',
    })
  })

  it('allows buddy to update buddy-only fields', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
    })
    const updatedReview = { ...review, name: 'Updated Name', notes: 'Some notes' }

    // existing review lookup — 'user-1' is the buddy
    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { name: 'Updated Name', notes: 'Some notes' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows reviewee to update reflection fields', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
    })
    const updatedReview = { ...review, reflectionLearnings: 'Learned a lot', reflectionHighlights: 'Great quarter' }

    // existing review lookup — 'user-1' is the reviewee
    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { reflectionLearnings: 'Learned a lot', reflectionHighlights: 'Great quarter' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('rejects updates on completed reviews', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
      status: 'completed',
    })

    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { reflectionLearnings: 'Trying to update' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot update a completed review',
    })
  })

  it('allows reviewee to update revieweeComments', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
    })
    const updatedReview = { ...review, revieweeComments: 'Some additional thoughts' }

    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { revieweeComments: 'Some additional thoughts' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows buddy to update reflection fields', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
    })
    const updatedReview = { ...review, reflectionLearnings: 'Buddy typed this up' }

    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { reflectionLearnings: 'Buddy typed this up' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows reviewee to update buddy comments', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
    })
    const updatedReview = { ...review, buddyComments: 'Reviewee added this' }

    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { buddyComments: 'Reviewee added this' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows admin to update any review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-5',
      buddyId: 'user-6',
    })
    const updatedReview = { ...review, name: 'Admin Update', buddyComments: 'Good progress' }

    // existing review lookup — admin is neither reviewee nor buddy but role is admin
    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAdminEvent({
      params: { id: 'review-1' },
      body: { name: 'Admin Update', buddyComments: 'Good progress' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true, review: updatedReview })
  })

  it('emits review_rescheduled notification when scheduledDate changes', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      scheduledDate: '2099-03-01T10:00:00.000Z',
    })
    const updatedReview = { ...review, scheduledDate: '2099-04-01T10:00:00.000Z' }

    // existing review lookup — 'user-1' is the buddy
    mockSelect([review])
    mockUpdate([updatedReview])
    // recipient lookup (user-2)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // actor lookup (user-1)
    mockSelect([{ name: 'User One', preferredName: null }])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { scheduledDate: '2099-04-01T10:00:00.000Z' },
    })

    await handler(event)

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'review_rescheduled' }),
    )
  })

  it('does NOT emit review_rescheduled when scheduledDate is unchanged', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      scheduledDate: '2099-03-01T10:00:00.000Z',
    })
    const updatedReview = { ...review, notes: 'New notes' }

    // existing review lookup
    mockSelect([review])
    mockUpdate([updatedReview])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { notes: 'New notes' },
    })

    await handler(event)

    expect(createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'review_rescheduled' }),
    )
  })
})
