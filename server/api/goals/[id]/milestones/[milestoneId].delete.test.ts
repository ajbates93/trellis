import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../../__tests__/helpers/mock-event'
import { buildMilestone } from '../../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./[milestoneId].delete')

describe('DELETE /api/goals/:id/milestones/:milestoneId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when goal is not found', async () => {
    // First select: goal query returns empty
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('deletes a milestone successfully', async () => {
    const existingMilestone = buildMilestone({ id: 'ms-1', goalId: 'goal-1' })

    // First select: goal ownership check
    mockSelect([{ id: 'goal-1', userId: 'user-1' }])
    // Second select: milestone existence check
    mockSelect([existingMilestone])
    // Delete: remove the milestone
    mockDelete([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })
})
