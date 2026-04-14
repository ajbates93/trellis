import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildGoal } from '#server/__tests__/helpers/factories'

const { mockDb, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./status.patch')

describe('PATCH /api/goals/:id/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'goal-1' },
      body: { status: 'completed' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when goal is not found', async () => {
    mockUpdate([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { status: 'completed' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: "Goal not found or you don't have permission to edit it",
    })
  })

  it('completes goal successfully', async () => {
    const completedGoal = buildGoal({
      id: 'goal-1',
      userId: 'user-1',
      status: 'completed',
      completedAt: new Date(),
    })
    mockUpdate([completedGoal])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { status: 'completed' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      goal: { ...completedGoal, milestones: [] },
    })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
