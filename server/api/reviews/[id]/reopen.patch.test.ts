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

const { default: handler } = await import('./reopen.patch')

describe('PATCH /api/reviews/:id/reopen', () => {
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
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'review-99' },
      body: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Review not found',
    })
  })

  it('returns 403 when the reviewee tries to re-open the review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
      status: 'completed',
    })

    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only the buddy or admin can re-open this review',
    })
  })

  it('returns 400 when review is not completed', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'scheduled',
    })

    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only completed reviews can be re-opened',
    })
  })

  it('allows the buddy to re-open a completed review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
      status: 'completed',
      completedDate: '2025-03-15T10:00:00.000Z',
      completionNotes: 'Great session',
    })

    mockSelect([review])
    mockUpdate([{ ...review, status: 'scheduled', completedDate: null }])

    const event = createAuthenticatedEvent({
      params: { id: 'review-1' },
      body: {},
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('scheduled')
    expect(result.review.completedDate).toBeNull()
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('allows an admin to re-open any completed review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-5',
      buddyId: 'user-6',
      status: 'completed',
      completedDate: '2025-03-15T10:00:00.000Z',
    })

    mockSelect([review])
    mockUpdate([{ ...review, status: 'scheduled', completedDate: null }])

    const event = createAdminEvent({
      params: { id: 'review-1' },
      body: {},
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.review.status).toBe('scheduled')
    expect(mockDb.update).toHaveBeenCalled()
  })
})
