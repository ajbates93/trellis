import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildFeedback } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./feedback-timeline.get')

describe('GET /api/analytics/feedback-timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns timeline data for authenticated user', async () => {
    const now = new Date()
    const recentDate = new Date(now)
    recentDate.setDate(now.getDate() - 1)

    const feedbackRows = [
      buildFeedback({
        reviewerId: 'user-1',
        revieweeId: 'user-2',
        published: true,
        createdAt: recentDate,
      }),
      buildFeedback({
        reviewerId: 'user-3',
        revieweeId: 'user-1',
        published: true,
        createdAt: recentDate,
      }),
    ]

    mockSelect(feedbackRows)

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toHaveProperty('timeline')
    expect(Array.isArray(result.timeline)).toBe(true)
    expect(result.timeline).toHaveLength(12)

    // Each entry should have the expected shape
    const entry = result.timeline[0]
    expect(entry).toHaveProperty('date')
    expect(entry).toHaveProperty('given')
    expect(entry).toHaveProperty('received')
  })

  it('returns zero counts when there is no feedback', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.timeline).toHaveLength(12)
    for (const week of result.timeline) {
      expect(week.given).toBe(0)
      expect(week.received).toBe(0)
    }
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB error')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch feedback timeline',
    })
  })
})
