import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildReviewSchedule, buildUser, buildFeedback, buildGoal } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.get')

describe('GET /api/reviews/:id', () => {
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

    const event = createAuthenticatedEvent({ params: { id: 'review-99' } })

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

    // review lookup returns a review that doesn't involve 'user-1' (session user)
    mockSelect([review])

    const event = createAuthenticatedEvent({ params: { id: 'review-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You do not have permission to view this review',
    })
  })

  it('returns review details for the reviewee', async () => {
    const user = buildUser({ id: 'user-1' })
    const buddy = buildUser({ id: 'user-2' })
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
      scheduledDate: '2025-03-01T10:00:00.000Z',
    })
    const feedbackItem = buildFeedback({ revieweeId: 'user-1', published: true })
    const goal = buildGoal({ userId: 'user-1' })

    // 1. review lookup
    mockSelect([review])
    // 2. user (reviewee) info
    mockSelect([{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, roleType: user.roleType }])
    // 3. buddy info
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 4. previous reviews lookup (for start date calculation)
    mockSelect([review])
    // 5. feedback for the review period
    mockSelect([{ ...feedbackItem, reviewer: { id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl } }])
    // 6. goals lookup
    mockSelect([{ id: goal.id, goalText: goal.goalText, status: goal.status, targetDate: goal.targetDate, createdAt: goal.createdAt }])

    const event = createAuthenticatedEvent({ params: { id: 'review-1' } })
    const result = await handler(event)

    expect(result.review).toMatchObject({
      id: review.id,
      userId: 'user-1',
      buddyId: 'user-2',
    })
    expect(result.feedbackCount).toBe(1)
    expect(result.goals).toHaveLength(1)
  })

  it('returns review details for the buddy', async () => {
    const user = buildUser({ id: 'user-3' })
    const buddy = buildUser({ id: 'user-1' })
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-3',
      buddyId: 'user-1',
    })

    // 1. review lookup — buddy is session user 'user-1'
    mockSelect([review])
    // 2. user info
    mockSelect([{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, roleType: user.roleType }])
    // 3. buddy info
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 4. previous reviews
    mockSelect([review])
    // 5. feedback
    mockSelect([])
    // 6. goals
    mockSelect([])

    const event = createAuthenticatedEvent({ params: { id: 'review-1' } })
    const result = await handler(event)

    expect(result.review).toMatchObject({ id: review.id })
    expect(result.feedbackCount).toBe(0)
  })

  it('allows admin to view any review', async () => {
    const user = buildUser({ id: 'user-5' })
    const buddy = buildUser({ id: 'user-6' })
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-5',
      buddyId: 'user-6',
    })

    // 1. review lookup — admin-1 is neither reviewee nor buddy
    mockSelect([review])
    // 2. user info
    mockSelect([{ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, roleType: user.roleType }])
    // 3. buddy info
    mockSelect([{ id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: buddy.avatarUrl, roleType: buddy.roleType }])
    // 4. previous reviews
    mockSelect([review])
    // 5. feedback
    mockSelect([])
    // 6. goals
    mockSelect([])

    const event = createAdminEvent({ params: { id: 'review-1' } })
    const result = await handler(event)

    expect(result.review).toMatchObject({ id: review.id })
  })
})
