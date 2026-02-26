import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./plant-health.get')

describe('GET /api/community/plant-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const event = createUnauthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns dead state when no feedback exists', async () => {
    // First query: feedback count
    mockSelect([{ count: 0 }])
    // Second query: user count
    mockSelect([{ count: 5 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      state: 'dead',
      healthPercent: 0,
      feedbackCount: 0,
      expectedCount: 10,
    })
  })

  it('returns healthy state for good participation', async () => {
    // 7 feedback submissions from 5 users (expected = 10)
    mockSelect([{ count: 7 }])
    mockSelect([{ count: 5 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      state: 'healthy',
      healthPercent: 70,
      feedbackCount: 7,
      expectedCount: 10,
    })
  })

  it('caps health at 100% for thriving', async () => {
    mockSelect([{ count: 20 }])
    mockSelect([{ count: 5 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.healthPercent).toBe(100)
    expect(result.state).toBe('thriving')
  })

  it('handles zero active users', async () => {
    mockSelect([{ count: 0 }])
    mockSelect([{ count: 0 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.healthPercent).toBe(0)
    expect(result.state).toBe('dead')
  })

  it('includes a message', async () => {
    mockSelect([{ count: 5 }])
    mockSelect([{ count: 5 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.message).toBeTruthy()
    expect(typeof result.message).toBe('string')
  })

  it('throws 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
