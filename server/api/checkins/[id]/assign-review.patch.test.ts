import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildCheckin, buildReviewSchedule, buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockUpdate } = createMockDb()

const mockFindFirst = vi.fn()

mockDb.query = {
  buddyCheckins: {
    findFirst: mockFindFirst,
  },
  reviewSchedules: {
    findFirst: mockFindFirst,
  },
}

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./assign-review.patch')

describe('PATCH /api/checkins/:id/assign-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('assigns a review to the checkin successfully', async () => {
    const checkin = buildCheckin({
      id: 'checkin-1',
      buddyId: 'user-1',
      userId: 'buddy-user-1',
    })
    const review = buildReviewSchedule({
      id: 'review-1',
      userId: 'buddy-user-1',
      buddyId: 'user-1',
    })

    const checkinWithUser = {
      ...checkin,
      user: { id: 'buddy-user-1', buddyId: 'user-1' },
    }

    const updatedCheckin = { ...checkin, reviewScheduleId: 'review-1' }

    const checkinWithRelations = {
      ...updatedCheckin,
      buddy: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
      user: { id: 'buddy-user-1', name: 'Buddy User', email: 'buddy@example.com', avatarUrl: null },
      reviewSchedule: {
        id: 'review-1',
        scheduledDate: review.scheduledDate,
        name: review.name,
        status: review.status,
      },
    }

    // First findFirst: fetch checkin with user relation
    mockFindFirst.mockResolvedValueOnce(checkinWithUser)
    // Second findFirst: validate the review exists
    mockFindFirst.mockResolvedValueOnce(review)
    // update checkin
    mockUpdate([updatedCheckin])
    // Third findFirst: fetch full checkin with all relations
    mockFindFirst.mockResolvedValueOnce(checkinWithRelations)

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { reviewScheduleId: 'review-1' },
    })

    const result = await handler(event) as any

    expect(result.success).toBe(true)
    expect(result.reviewSchedule.id).toBe('review-1')
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('clears the review assignment when reviewScheduleId is null', async () => {
    const checkin = buildCheckin({
      id: 'checkin-1',
      buddyId: 'user-1',
      userId: 'buddy-user-1',
      reviewScheduleId: 'review-1',
    })

    const checkinWithUser = {
      ...checkin,
      user: { id: 'buddy-user-1', buddyId: 'user-1' },
    }

    const updatedCheckin = { ...checkin, reviewScheduleId: null }

    const checkinWithRelations = {
      ...updatedCheckin,
      buddy: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
      user: { id: 'buddy-user-1', name: 'Buddy User', email: 'buddy@example.com', avatarUrl: null },
      reviewSchedule: null,
    }

    // First findFirst: fetch checkin
    mockFindFirst.mockResolvedValueOnce(checkinWithUser)
    // update (no review validation needed when reviewScheduleId is null/falsy)
    mockUpdate([updatedCheckin])
    // Second findFirst: fetch full checkin with relations
    mockFindFirst.mockResolvedValueOnce(checkinWithRelations)

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { reviewScheduleId: null },
    })

    const result = await handler(event) as any

    expect(result.success).toBe(true)
    expect(result.reviewSchedule).toBeNull()
  })

  it('returns 404 when checkin does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-nonexistent' },
      body: { reviewScheduleId: 'review-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 403 when session user is not the buddy of the checkin user', async () => {
    const checkin = buildCheckin({
      id: 'checkin-1',
      buddyId: 'user-99',
      userId: 'buddy-user-1',
    })

    const checkinWithUser = {
      ...checkin,
      user: { id: 'buddy-user-1', buddyId: 'someone-else' },
    }

    mockFindFirst.mockResolvedValueOnce(checkinWithUser)

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { reviewScheduleId: 'review-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 404 when the review schedule does not exist', async () => {
    const checkin = buildCheckin({
      id: 'checkin-1',
      buddyId: 'user-1',
      userId: 'buddy-user-1',
    })

    const checkinWithUser = {
      ...checkin,
      user: { id: 'buddy-user-1', buddyId: 'user-1' },
    }

    // First findFirst: checkin exists
    mockFindFirst.mockResolvedValueOnce(checkinWithUser)
    // Second findFirst: review does not exist
    mockFindFirst.mockResolvedValueOnce(null)

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { reviewScheduleId: 'review-nonexistent' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
