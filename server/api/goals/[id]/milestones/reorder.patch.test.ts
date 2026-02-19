import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../../__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./reorder.patch')

describe('PATCH /api/goals/:id/milestones/reorder', () => {
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
      body: {
        milestones: [
          { id: 'ms-1', displayOrder: 0 },
          { id: 'ms-2', displayOrder: 1 },
        ],
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('reorders milestones successfully', async () => {
    const milestonesInput = [
      { id: 'ms-1', displayOrder: 1 },
      { id: 'ms-2', displayOrder: 0 },
    ]

    // First select: goal ownership check
    mockSelect([{ id: 'goal-1', userId: 'user-1' }])
    // Second select: verify milestones exist
    mockSelect([{ id: 'ms-1' }, { id: 'ms-2' }])
    // One update per milestone via Promise.all
    mockUpdate([])
    mockUpdate([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { milestones: milestonesInput },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })
})
