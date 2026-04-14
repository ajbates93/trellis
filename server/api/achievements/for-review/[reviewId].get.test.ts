import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildAchievement, buildReviewSchedule } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./[reviewId].get')

describe('GET /api/achievements/for-review/:reviewId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when review does not exist', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { reviewId: 'review-nonexistent' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns achievements for the review period (user is reviewee)', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-1',
      buddyId: 'user-2',
      scheduledDate: '2025-03-01',
    })

    const achievement1 = buildAchievement({
      userId: 'user-1',
      achievedDate: '2025-02-10',
    })
    const achievement2 = buildAchievement({
      userId: 'user-1',
      achievedDate: '2025-01-20',
    })
    // Achievement outside the range should be filtered out
    const achievementOutOfRange = buildAchievement({
      userId: 'user-1',
      achievedDate: '2025-04-01',
    })

    // First select: fetch the review by id
    mockSelect([review])
    // Second select: fetch previous reviews for date range calculation
    mockSelect([review])
    // Third select: all achievements for the user
    mockSelect([achievementOutOfRange, achievement1, achievement2])

    const event = createAuthenticatedEvent({
      params: { reviewId: 'review-1' },
    })

    const result = await handler(event) as any

    expect(result).toHaveProperty('achievements')
    // achievementOutOfRange has achievedDate '2025-04-01' > scheduledDate '2025-03-01', so filtered out
    expect(result.achievements).not.toContainEqual(achievementOutOfRange)
    expect(result.achievements).toContainEqual(achievement1)
    expect(result.achievements).toContainEqual(achievement2)
  })

  it('returns achievements for the review period (user is buddy)', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-99',
      buddyId: 'user-1', // current user is the buddy
      scheduledDate: '2025-03-01',
    })

    const achievement = buildAchievement({
      userId: 'user-99',
      achievedDate: '2025-02-01',
    })

    // First select: fetch the review by id
    mockSelect([review])
    // Second select: previous reviews for range calculation
    mockSelect([review])
    // Third select: all achievements for the user
    mockSelect([achievement])

    const event = createAuthenticatedEvent({
      params: { reviewId: 'review-1' },
    })

    const result = await handler(event) as any

    expect(result).toHaveProperty('achievements')
    expect(result.achievements).toContainEqual(achievement)
  })

  it('returns 403 when user is neither reviewee nor buddy', async () => {
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'user-99',
      buddyId: 'user-88',
      scheduledDate: '2025-03-01',
    })

    mockSelect([review])

    const event = createAuthenticatedEvent({
      params: { reviewId: 'review-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent({
      params: { reviewId: 'review-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
