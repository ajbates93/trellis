import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./[userId].get')

describe('GET /api/feedback/can-review/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { userId: 'user-2' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when userId param is missing', async () => {
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns canReview true and alreadyReviewedThisWeek false when no existing feedback', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({ params: { userId: 'user-2' } })
    const result = await handler(event)

    expect(result).toEqual({
      canReview: true,
      alreadyReviewedThisWeek: false,
      message: 'You can give feedback to this person',
    })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns canReview true and alreadyReviewedThisWeek true when already reviewed this week', async () => {
    mockSelect([{ id: 'some-feedback' }])

    const event = createAuthenticatedEvent({ params: { userId: 'user-2' } })
    const result = await handler(event)

    expect(result).toEqual({
      canReview: true,
      alreadyReviewedThisWeek: true,
      message: "You've already given feedback to this person this week",
    })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
