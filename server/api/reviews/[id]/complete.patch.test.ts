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

const { default: handler } = await import('./complete.patch')

describe('PATCH /api/reviews/:id/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { id: 'review-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when review is not found', async () => {
    // review lookup returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'review-99' },
      body: { completionNotes: 'Great session' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Review not found',
    })
  })

  it('returns 403 when the reviewee tries to complete the review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
      status: 'scheduled',
    })

    // review lookup — 'user-1' is the reviewee, not the buddy
    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only the buddy or admin can complete this review',
    })
  })

  it('allows the buddy to complete a review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'scheduled',
    })

    // review lookup — 'user-1' is the buddy
    mockSelect([review])
    mockUpdate([{ ...review, status: 'completed', completedDate: new Date().toISOString(), completionNotes: 'Great session' }])
    // recipient lookup (user-2, the reviewee)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // actor lookup (user-1, the buddy)
    mockSelect([{ name: 'User One', preferredName: null }])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: { completionNotes: 'Great session' },
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('completed')
    expect(result.review.completionNotes).toBe('Great session')
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows the buddy to complete a review without completion notes', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'scheduled',
    })

    mockSelect([review])
    mockUpdate([{ ...review, status: 'completed', completedDate: new Date().toISOString(), completionNotes: null }])
    // recipient lookup (user-2)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // actor lookup (user-1)
    mockSelect([{ name: 'User One', preferredName: null }])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('completed')
    expect(result.review.completionNotes).toBeNull()
  })

  it('allows an admin to complete any review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-5',
      buddyId: 'user-6',
      status: 'scheduled',
    })

    // review lookup — admin is neither reviewee nor buddy
    mockSelect([review])
    mockUpdate([{ ...review, status: 'completed', completedDate: new Date().toISOString(), completionNotes: null }])
    // recipient lookup (user-5, the reviewee)
    mockSelect([{ name: 'User Five', preferredName: null, email: 'user5@example.com' }])
    // actor lookup (admin user)
    mockSelect([{ name: 'Admin User', preferredName: null }])

    const event = createAdminEvent({
      params: { id: 'review-1' },
      body: {},
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('completed')
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('emits review_completed notification when a review is completed', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'scheduled',
    })

    mockSelect([review])
    mockUpdate([{ ...review, status: 'completed', completedDate: new Date().toISOString(), completionNotes: null }])
    // recipient lookup (user-2)
    mockSelect([{ name: 'User Two', preferredName: null, email: 'user2@example.com' }])
    // actor lookup (user-1)
    mockSelect([{ name: 'User One', preferredName: null }])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    await handler(event)

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'review_completed' }),
    )
  })
})
