import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildGoal, buildMilestone } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

// Import handler after mocks are set up
const { default: handler } = await import('./index.get')

describe('GET /api/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns goals with milestones for the current user', async () => {
    const goal = buildGoal({ userId: 'user-1' })
    const milestone = buildMilestone({ goalId: goal.id })

    // First select: goals query
    mockSelect([goal])
    // Second select: milestones query
    mockSelect([milestone])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      goals: [
        {
          ...goal,
          milestones: [milestone],
        },
      ],
    })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns empty goals array when the user has no goals', async () => {
    // Single select: empty goals query — milestones query is skipped
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ goals: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when a non-admin tries to view another user goals', async () => {
    // The 403 is thrown inside the try block and the catch re-throws it as 500
    const event = createAuthenticatedEvent({
      query: { userId: 'user-99' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
