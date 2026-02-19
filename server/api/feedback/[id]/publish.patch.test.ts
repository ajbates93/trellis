import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildFeedback } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/notifications', () => ({
  notifyRevieweeOfPublishedFeedback: vi.fn(),
}))

const { default: handler } = await import('./publish.patch')

describe('PATCH /api/feedback/:id/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'feedback-1' },
      body: { published: true },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when feedback is not found', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'feedback-1' },
      body: { published: true },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Feedback not found',
    })
  })

  it('returns 400 when feedback is already published', async () => {
    mockSelect([
      {
        id: 'f1',
        revieweeId: 'user-2',
        published: true,
        createdAt: new Date(),
      },
    ])

    const event = createAuthenticatedEvent({
      params: { id: 'feedback-1' },
      body: { published: true },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Feedback is already published',
    })
  })

  it('returns 403 when the current user is not the reviewee buddy', async () => {
    mockSelect([
      {
        id: 'f1',
        revieweeId: 'user-2',
        published: false,
        createdAt: new Date(),
      },
    ])
    mockSelect([{ buddyId: 'other-user' }])

    const event = createAuthenticatedEvent({
      params: { id: 'feedback-1' },
      body: { published: true },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You are not authorized to publish this feedback',
    })
  })

  it('publishes feedback successfully when the current user is the reviewee buddy', async () => {
    const unpublishedFeedback = buildFeedback({
      id: 'f1',
      revieweeId: 'user-2',
      published: false,
    })

    const updatedFeedback = {
      ...unpublishedFeedback,
      published: true,
      publishedAt: new Date(),
      publishedBy: 'user-1',
    }

    mockSelect([
      {
        id: unpublishedFeedback.id,
        revieweeId: unpublishedFeedback.revieweeId,
        published: unpublishedFeedback.published,
        createdAt: unpublishedFeedback.createdAt,
      },
    ])
    mockSelect([{ buddyId: 'user-1' }])
    mockUpdate([updatedFeedback])

    const event = createAuthenticatedEvent({
      params: { id: 'feedback-1' },
      body: { published: true },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      feedback: updatedFeedback,
    })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
