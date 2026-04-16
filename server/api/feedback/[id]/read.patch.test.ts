import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildFeedback } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./read.patch')

describe('PATCH /api/feedback/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { id: 'feedback-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when id param is missing', async () => {
    const event = createAuthenticatedEvent({ params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Feedback ID is required',
    })
  })

  it('returns 404 when feedback is not found', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({ params: { id: 'feedback-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Feedback not found',
    })
  })

  it('returns 403 when user is not the reviewee', async () => {
    mockSelect([{ id: 'f1', revieweeId: 'other-user', published: true, isRead: false }])

    const event = createAuthenticatedEvent({ params: { id: 'f1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You can only mark your own feedback as read',
    })
  })

  it('returns 403 when feedback is unpublished', async () => {
    mockSelect([{ id: 'f1', revieweeId: 'user-1', published: false, isRead: false }])

    const event = createAuthenticatedEvent({ params: { id: 'f1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Cannot mark unpublished feedback as read',
    })
  })

  it('returns success without updating when feedback is already read', async () => {
    const feedbackItem = { id: 'f1', revieweeId: 'user-1', published: true, isRead: true }
    mockSelect([feedbackItem])

    const event = createAuthenticatedEvent({ params: { id: 'f1' } })

    const result = await handler(event)

    expect(result).toEqual({ success: true, feedback: feedbackItem })
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('marks feedback as read successfully', async () => {
    const feedbackItem = buildFeedback({
      id: 'f1',
      revieweeId: 'user-1',
      published: true,
      isRead: false,
    })
    const updatedFeedback = { ...feedbackItem, isRead: true }

    mockSelect([{ id: feedbackItem.id, revieweeId: feedbackItem.revieweeId, published: feedbackItem.published, isRead: feedbackItem.isRead }])
    mockUpdate([updatedFeedback])

    const event = createAuthenticatedEvent({ params: { id: 'f1' } })

    const result = await handler(event)

    expect(result).toEqual({ success: true, feedback: updatedFeedback })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
