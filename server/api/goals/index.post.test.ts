import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildGoal } from '../../__tests__/helpers/factories'

const { mockDb, mockInsert } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

// Import handler after mocks are set up
const { default: handler } = await import('./index.post')

describe('POST /api/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('creates a goal successfully', async () => {
    const newGoal = buildGoal({ userId: 'user-1', goalText: 'Learn Rust' })

    mockInsert([newGoal])

    const event = createAuthenticatedEvent({
      body: { goalText: 'Learn Rust' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      goal: {
        ...newGoal,
        milestones: [],
      },
    })
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent({
      body: { goalText: 'Learn Rust' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
