import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildFeedback, buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./given.get')

describe('GET /api/feedback/given', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns given feedback for current user', async () => {
    const reviewee = buildUser({ id: 'user-2', name: 'Reviewee User', email: 'reviewee@example.com' })
    const givenFeedback = [
      {
        ...buildFeedback({ reviewerId: 'user-1', revieweeId: 'user-2' }),
        reviewee: {
          id: reviewee.id,
          name: reviewee.name,
          email: reviewee.email,
          image: reviewee.image,
          avatarUrl: reviewee.avatarUrl,
        },
      },
    ]

    mockSelect(givenFeedback)

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ feedback: givenFeedback })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty array when no feedback given', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ feedback: [] })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
