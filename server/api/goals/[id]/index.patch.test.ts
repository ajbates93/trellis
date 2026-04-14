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

const { default: handler } = await import('./index.patch')

describe('PATCH /api/goals/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'goal-1' },
      body: { goalText: 'Updated' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when goalId is missing', async () => {
    const event = createAuthenticatedEvent({
      params: {},
      body: { goalText: 'Updated' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Goal ID is required',
    })
  })

  it('returns 404 when goal is not found', async () => {
    mockUpdate([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { goalText: 'Updated' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: "Goal not found or you don't have permission to edit it",
    })
  })

  it('updates goal successfully', async () => {
    const updatedGoal = buildGoal({ id: 'goal-1', userId: 'user-1', goalText: 'Updated' })
    mockUpdate([updatedGoal])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { goalText: 'Updated' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      goal: { ...updatedGoal, milestones: [] },
    })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
