import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    const completedReview = {
      ...review,
      status: 'completed',
      completedDate: expect.any(String),
      completionNotes: 'Great session',
    }

    // review lookup — 'user-1' is the buddy
    mockSelect([review])
    mockUpdate([{ ...review, status: 'completed', completedDate: new Date().toISOString(), completionNotes: 'Great session' }])

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

    const event = createAdminEvent({
      params: { id: 'review-1' },
      body: {},
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('completed')
    expect(mockDb.update).toHaveBeenCalled()
  })
})
