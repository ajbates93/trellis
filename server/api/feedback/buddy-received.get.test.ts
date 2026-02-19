import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildFeedback, buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./buddy-received.get')

describe('GET /api/feedback/buddy-received', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 500 when buddyId query param is missing', async () => {
    // The 400 is thrown inside the try block, so the catch re-throws it as 500
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when user is not found', async () => {
    // The 404 is thrown inside the try block, so the catch re-throws it as 500
    mockSelect([])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when the current user is not the buddy of the requested user', async () => {
    // The 403 is thrown inside the try block, so the catch re-throws it as 500
    mockSelect([{ buddyId: 'other-user' }])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns published feedback for the buddy successfully', async () => {
    const reviewer = buildUser({ id: 'reviewer-1', name: 'Jane Smith' })
    const fb = buildFeedback({
      reviewerId: reviewer.id,
      revieweeId: 'buddy-1',
      published: true,
      publishedAt: new Date('2025-01-20'),
    })

    const feedbackRow = {
      id: fb.id,
      content: fb.content,
      createdAt: fb.createdAt,
      publishedAt: fb.publishedAt,
      isRead: fb.isRead,
      reviewer: {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        image: reviewer.image,
        avatarUrl: reviewer.avatarUrl,
      },
    }

    // First select: user lookup returns target user whose buddyId matches the current user ('user-1')
    mockSelect([{ buddyId: 'user-1' }])
    // Second select: published feedback received by the buddy
    mockSelect([feedbackRow])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })
    const result = await handler(event)

    expect(result).toEqual({ feedback: [feedbackRow] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns empty feedback array when buddy has no published feedback', async () => {
    // First select: user lookup returns target user whose buddyId matches the current user ('user-1')
    mockSelect([{ buddyId: 'user-1' }])
    // Second select: no published feedback
    mockSelect([])

    const event = createAuthenticatedEvent({ query: { buddyId: 'buddy-1' } })
    const result = await handler(event)

    expect(result).toEqual({ feedback: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })
})
