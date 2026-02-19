import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../../__tests__/helpers/mock-event'
import { buildMilestone } from '../../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./[milestoneId].patch')

describe('PATCH /api/goals/:id/milestones/:milestoneId', () => {
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
      body: { title: 'Updated Title' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 403 when goal does not belong to the user', async () => {
    // First select: goal belongs to a different user
    mockSelect([{ id: 'goal-1', userId: 'other-user' }])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
      body: { title: 'Updated Title' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 404 when milestone is not found', async () => {
    // First select: goal ownership check passes
    mockSelect([{ id: 'goal-1', userId: 'user-1' }])
    // Second select: milestone query returns empty
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
      body: { title: 'Updated Title' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('updates a milestone successfully', async () => {
    const existingMilestone = buildMilestone({ id: 'ms-1', goalId: 'goal-1', title: 'Old Title' })
    const updatedMilestone = { ...existingMilestone, title: 'Updated Title' }

    // First select: goal ownership check
    mockSelect([{ id: 'goal-1', userId: 'user-1' }])
    // Second select: milestone existence check
    mockSelect([existingMilestone])
    // Update: apply the changes
    mockUpdate([updatedMilestone])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1', milestoneId: 'ms-1' },
      body: { title: 'Updated Title' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      milestone: updatedMilestone,
    })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })
})
