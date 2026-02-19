import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../../__tests__/helpers/mock-event'
import { buildGoal, buildMilestone } from '../../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/goals/:id/milestones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { id: 'goal-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when goal is not found', async () => {
    // First select: goal query returns empty
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { title: 'New Milestone' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 403 when goal does not belong to the user', async () => {
    // First select: goal belongs to a different user
    mockSelect([{ id: 'goal-1', userId: 'other-user' }])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { title: 'New Milestone' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('creates a milestone successfully', async () => {
    const goal = buildGoal({ id: 'goal-1', userId: 'user-1' })
    const milestone = buildMilestone({ goalId: 'goal-1', title: 'New Milestone', displayOrder: 0 })

    // First select: goal ownership check
    mockSelect([{ id: 'goal-1', userId: 'user-1' }])
    // Second select: max displayOrder query
    mockSelect([{ maxOrder: null }])
    // Insert: create the milestone
    mockInsert([milestone])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { title: 'New Milestone' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      milestone,
    })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })
})
