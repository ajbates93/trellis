import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildFeedback, buildGoal } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./recent-activity.get')

describe('GET /api/admin/recent-activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty activity when both queries return no rows', async () => {
    // First select: recent feedback; second select: recent goals
    mockSelect([])
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { activity: unknown[] }

    expect(result).toEqual({ activity: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns feedback items mapped with type "feedback"', async () => {
    const fb = buildFeedback({ reviewerId: 'user-1', revieweeId: 'user-2' })
    const feedbackRow = {
      id: fb.id,
      type: 'feedback',
      content: fb.content,
      createdAt: fb.createdAt,
      reviewerName: 'Alice',
      revieweeName: 'Bob',
      published: fb.published,
    }

    mockSelect([feedbackRow])
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { activity: any[] }

    expect(result.activity).toHaveLength(1)
    expect(result.activity[0]).toMatchObject({
      id: fb.id,
      type: 'feedback',
      content: fb.content,
      metadata: {
        reviewerName: 'Alice',
        revieweeName: 'Bob',
        published: fb.published,
      },
    })
  })

  it('returns goal items mapped with type "goal"', async () => {
    const goal = buildGoal({ userId: 'user-1', status: 'active' })
    const goalRow = {
      id: goal.id,
      type: 'goal',
      content: goal.goalText,
      createdAt: goal.createdAt,
      userName: 'Alice',
      status: goal.status,
    }

    mockSelect([])
    mockSelect([goalRow])

    const event = createAdminEvent()
    const result = await handler(event) as { activity: any[] }

    expect(result.activity).toHaveLength(1)
    expect(result.activity[0]).toMatchObject({
      id: goal.id,
      type: 'goal',
      content: goal.goalText,
      metadata: {
        userName: 'Alice',
        status: 'active',
      },
    })
  })

  it('combines and sorts feedback and goals by createdAt descending', async () => {
    const olderFb = buildFeedback()
    const feedbackRow = {
      id: olderFb.id,
      type: 'feedback',
      content: olderFb.content,
      createdAt: new Date('2025-01-10'),
      reviewerName: 'Alice',
      revieweeName: 'Bob',
      published: false,
    }

    const newerGoal = buildGoal()
    const goalRow = {
      id: newerGoal.id,
      type: 'goal',
      content: newerGoal.goalText,
      createdAt: new Date('2025-01-20'),
      userName: 'Alice',
      status: 'active',
    }

    mockSelect([feedbackRow])
    mockSelect([goalRow])

    const event = createAdminEvent()
    const result = await handler(event) as { activity: any[] }

    expect(result.activity).toHaveLength(2)
    // Newer item (goal) should appear first
    expect(result.activity[0].type).toBe('goal')
    expect(result.activity[1].type).toBe('feedback')
  })

  it('caps combined results at 20 items', async () => {
    const feedbackRows = Array.from({ length: 10 }, (_, i) =>
      ({
        id: `fb-${i}`,
        type: 'feedback',
        content: `Feedback ${i}`,
        createdAt: new Date(`2025-01-${(i + 1).toString().padStart(2, '0')}`),
        reviewerName: 'Alice',
        revieweeName: 'Bob',
        published: false,
      })
    )

    const goalRows = Array.from({ length: 15 }, (_, i) =>
      ({
        id: `goal-${i}`,
        type: 'goal',
        content: `Goal ${i}`,
        createdAt: new Date(`2025-02-${(i + 1).toString().padStart(2, '0')}`),
        userName: 'Alice',
        status: 'active',
      })
    )

    mockSelect(feedbackRows)
    mockSelect(goalRows)

    const event = createAdminEvent()
    const result = await handler(event) as { activity: any[] }

    expect(result.activity.length).toBeLessThanOrEqual(20)
  })

  it('handles items with null createdAt without throwing', async () => {
    const feedbackRow = {
      id: 'fb-null-date',
      type: 'feedback',
      content: 'Some content',
      createdAt: null,
      reviewerName: 'Alice',
      revieweeName: 'Bob',
      published: false,
    }

    mockSelect([feedbackRow])
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { activity: any[] }

    expect(result.activity).toHaveLength(1)
  })

  it('works for a non-admin authenticated user (no auth guard)', async () => {
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as { activity: unknown[] }

    expect(result).toEqual({ activity: [] })
  })

  it('throws 500 when the database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
