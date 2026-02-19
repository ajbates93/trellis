import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildFeedback } from '../../__tests__/helpers/factories'

const { mockDb, mockInsert } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/notifications', () => ({
  notifyBuddyOfNewFeedback: vi.fn(),
}))

// Import handler after mocks are set up
const { default: handler } = await import('./index.post')

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when reviewing yourself', async () => {
    const event = createAuthenticatedEvent({
      body: { revieweeId: 'user-1', content: 'Self review' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'You cannot give feedback to yourself',
    })
  })

  it('creates feedback successfully', async () => {
    const newFeedback = buildFeedback({
      reviewerId: 'user-1',
      revieweeId: 'user-2',
      content: 'Great work!',
    })

    mockInsert([newFeedback])

    const event = createAuthenticatedEvent({
      body: { revieweeId: 'user-2', content: 'Great work!' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      feedback: newFeedback,
    })
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    // Make insert throw
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent({
      body: { revieweeId: 'user-2', content: 'Some feedback' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
