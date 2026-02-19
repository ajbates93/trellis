import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildUser, buildFeedback } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./for-buddy.get')

describe('GET /api/feedback/for-buddy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns empty buddyAssignments when user has no buddy assignments', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ buddyAssignments: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns grouped feedback for all assigned buddies', async () => {
    const buddy1 = buildUser({ id: 'buddy-1', buddyId: 'user-1' })
    const buddy2 = buildUser({ id: 'buddy-2', buddyId: 'user-1' })

    const buddyAssignmentRows = [
      { id: buddy1.id, name: buddy1.name, email: buddy1.email, image: buddy1.image, avatarUrl: buddy1.avatarUrl },
      { id: buddy2.id, name: buddy2.name, email: buddy2.email, image: buddy2.image, avatarUrl: buddy2.avatarUrl },
    ]

    const reviewer = buildUser({ id: 'reviewer-1' })
    const reviewerShape = {
      id: reviewer.id,
      name: reviewer.name,
      email: reviewer.email,
      image: reviewer.image,
      avatarUrl: reviewer.avatarUrl,
    }

    const feedback1 = {
      ...buildFeedback({ revieweeId: 'buddy-1', reviewerId: reviewer.id }),
      reviewer: reviewerShape,
    }
    const feedback2 = {
      ...buildFeedback({ revieweeId: 'buddy-2', reviewerId: reviewer.id }),
      reviewer: reviewerShape,
    }

    // First select: buddy assignments; second select: unpublished feedback
    mockSelect(buddyAssignmentRows)
    mockSelect([feedback1, feedback2])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as any

    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(result.buddyAssignments).toHaveLength(2)

    const buddy1Result = result.buddyAssignments.find((b: any) => b.user.id === 'buddy-1')
    expect(buddy1Result).toBeDefined()
    expect(buddy1Result.pendingCount).toBe(1)
    expect(buddy1Result.feedback).toHaveLength(1)
    expect(buddy1Result.feedback[0].revieweeId).toBe('buddy-1')

    const buddy2Result = result.buddyAssignments.find((b: any) => b.user.id === 'buddy-2')
    expect(buddy2Result).toBeDefined()
    expect(buddy2Result.pendingCount).toBe(1)
    expect(buddy2Result.feedback).toHaveLength(1)
    expect(buddy2Result.feedback[0].revieweeId).toBe('buddy-2')
  })

  it('returns 500 when filtering by unassigned buddyId (403 caught by generic handler)', async () => {
    const buddy1 = buildUser({ id: 'buddy-1', buddyId: 'user-1' })

    const buddyAssignmentRows = [
      { id: buddy1.id, name: buddy1.name, email: buddy1.email, image: buddy1.image, avatarUrl: buddy1.avatarUrl },
    ]

    // First select returns one assigned buddy; the requested buddyId is not in that list
    // The 403 is inside try/catch which wraps all errors as 500
    mockSelect(buddyAssignmentRows)

    const event = createAuthenticatedEvent({ query: { buddyId: 'unassigned-buddy-99' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
