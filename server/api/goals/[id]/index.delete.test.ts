import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildGoal } from '#server/__tests__/helpers/factories'

const { mockDb, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.delete')

describe('DELETE /api/goals/:id', () => {
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
    mockDelete([])

    const event = createAuthenticatedEvent({ params: { id: 'goal-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: "Goal not found or you don't have permission to delete it",
    })
  })

  it('deletes goal successfully', async () => {
    const goal = buildGoal({ id: 'goal-1', userId: 'user-1' })
    mockDelete([goal])

    const event = createAuthenticatedEvent({ params: { id: 'goal-1' } })

    const result = await handler(event)

    expect(result).toEqual({ success: true, goal })
    expect(mockDb.delete).toHaveBeenCalled()
  })
})
