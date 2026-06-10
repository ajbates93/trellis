import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import {
  buildUser,
} from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./activity.get')

describe('GET /api/dashboard/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('aggregates all six event types with templated descriptions', async () => {
    // Queries in order (matches handler):
    // 1. Buddies (users where buddy_id = me)
    // 2. Feedback received (published)
    // 3. Feedback given
    // 4. Goal milestones (completed)
    // 5. Achievements (brag bucket)
    // 6. Buddy feedback (feedback for any buddee)
    // 7. Review schedules (completed)

    const buddee = buildUser({ id: 'buddee-1', name: 'Matej' })
    const myReceived = [{
      id: 'fb-1',
      personName: 'Alex',
      isRead: false,
      createdAt: new Date('2026-04-10T10:00:00Z'),
    }]
    const myGiven = [{
      id: 'fb-2',
      personName: 'Marcin',
      createdAt: new Date('2026-04-09T10:00:00Z'),
    }]
    const milestoneRows = [{
      id: 'ms-1',
      title: 'Ship Phase 1',
      completedAt: new Date('2026-04-08T10:00:00Z'),
    }]
    const achievementRows = [{
      id: 'ach-1',
      title: 'Launched dashboard redesign',
      createdAt: new Date('2026-04-07T10:00:00Z'),
    }]
    const buddyFeedbackRows = [{
      id: 'fb-3',
      reviewerName: 'External',
      buddeeId: 'buddee-1',
      publishedAt: new Date('2026-04-06T10:00:00Z'),
    }]
    const reviewRows = [{
      id: 'rev-1',
      userName: 'Marcin',
      completedDate: new Date('2026-04-05T10:00:00Z'),
    }]

    mockSelect([buddee])          // 1. Buddies
    mockSelect(myReceived)        // 2. Feedback received
    mockSelect(myGiven)           // 3. Feedback given
    mockSelect(milestoneRows)     // 4. Milestones
    mockSelect(achievementRows)   // 5. Achievements
    mockSelect(buddyFeedbackRows) // 6. Buddy feedback
    mockSelect(reviewRows)        // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(6)

    const byType = Object.fromEntries(
      result.activities.map((a: any) => [a.type, a]),
    )

    expect(byType.feedback_received).toMatchObject({
      description: 'You received feedback from Alex',
      href: '/feedback/inbox',
      isRead: false,
    })
    expect(byType.feedback_given).toMatchObject({
      description: 'You submitted feedback for Marcin',
      href: '/feedback/inbox?tab=given',
      isRead: null,
    })
    expect(byType.goal_milestone).toMatchObject({
      description: 'Milestone completed: "Ship Phase 1"',
      href: '/goals',
    })
    expect(byType.brag_bucket).toMatchObject({
      description: 'You added to your brag bucket: "Launched dashboard redesign"',
      href: '/brag-bucket',
    })
    expect(byType.buddy_feedback).toMatchObject({
      description: 'External submitted feedback for Matej',
      href: '/buddies/feedback?buddy=buddee-1',
    })
    expect(byType.review_completed).toMatchObject({
      description: 'Review with Marcin completed',
      href: '/reviews',
    })
  })

  it('sorts activities by createdAt descending', async () => {
    const older = [{
      id: 'fb-old',
      personName: 'Alex',
      isRead: false,
      createdAt: new Date('2026-03-01T00:00:00Z'),
    }]
    const newer = [{
      id: 'fb-new',
      personName: 'Marcin',
      createdAt: new Date('2026-04-01T00:00:00Z'),
    }]

    mockSelect([])      // 1. Buddies
    mockSelect(older)   // 2. Received
    mockSelect(newer)   // 3. Given
    mockSelect([])      // 4. Milestones
    mockSelect([])      // 5. Achievements
    mockSelect([])      // 6. Buddy feedback
    mockSelect([])      // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(2)
    expect(result.activities[0]?.id).toContain('fb-new')
    expect(result.activities[1]?.id).toContain('fb-old')
  })

  it('limits result to 10 items by default', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `fb-${i}`,
      personName: 'Alex',
      isRead: false,
      createdAt: new Date(2026, 3, i + 1),
    }))

    mockSelect([])    // 1. Buddies
    mockSelect(many)  // 2. Received
    mockSelect([])    // 3. Given
    mockSelect([])    // 4. Milestones
    mockSelect([])    // 5. Achievements
    mockSelect([])    // 6. Buddy feedback
    mockSelect([])    // 7. Reviews

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toHaveLength(10)
  })

  it('returns empty activities array when no data', async () => {
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.activities).toEqual([])
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch dashboard activity',
    })
  })
})
