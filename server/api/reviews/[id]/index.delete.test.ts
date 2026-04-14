import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildReviewSchedule } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.delete')

describe('DELETE /api/reviews/:id', () => {
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
    // existing review lookup returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent({ params: { id: 'review-99' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Review not found',
    })
  })

  it('returns 403 when user is neither the buddy nor an admin', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-3',
    })

    // existing review lookup — 'user-1' is the reviewee, not the buddy
    mockSelect([review])

    const event = createAuthenticatedEvent({ params: { id: 'review-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You do not have permission to delete this review',
    })
  })

  it('allows the buddy to delete a review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-2',
      buddyId: 'user-1',
    })

    // existing review lookup — 'user-1' is the buddy
    mockSelect([review])
    mockDelete([])

    const event = createAuthenticatedEvent({ params: { id: 'review-1' } })
    const result = await handler(event)

    expect(result).toEqual({ success: true, message: 'Review deleted successfully' })
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('allows an admin to delete any review', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-5',
      buddyId: 'user-6',
    })

    // existing review lookup — admin is neither reviewee nor buddy
    mockSelect([review])
    mockDelete([])

    const event = createAdminEvent({ params: { id: 'review-1' } })
    const result = await handler(event)

    expect(result).toEqual({ success: true, message: 'Review deleted successfully' })
    expect(mockDb.delete).toHaveBeenCalled()
  })
})
