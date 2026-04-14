import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildFeedback } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/notifications', () => ({
  notifyRevieweeOfPublishedFeedback: vi.fn(),
}))

const { default: handler } = await import('./publish-batch.post')

describe('POST /api/feedback/publish-batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when no feedback found', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      body: { feedbackIds: ['f1', 'f2'] },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'No feedback found with provided IDs',
    })
  })

  it('returns 400 when some feedback is already published', async () => {
    mockSelect([
      {
        id: 'f1',
        revieweeId: 'u2',
        published: true,
        createdAt: new Date(),
      },
    ])

    const event = createAuthenticatedEvent({
      body: { feedbackIds: ['f1'] },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: '1 feedback item(s) already published',
    })
  })

  it('returns 403 when not buddy for all reviewees', async () => {
    mockSelect([
      buildFeedback({ id: 'f1', revieweeId: 'u2', published: false }),
    ])
    mockSelect([
      { id: 'u2', buddyId: 'other-user' },
    ])

    const event = createAuthenticatedEvent({
      body: { feedbackIds: ['f1'] },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You are not authorized to publish feedback for some of these users',
    })
  })

  it('publishes batch successfully', async () => {
    const feedbackItem1 = buildFeedback({ id: 'f1', revieweeId: 'user-2', published: false })
    const feedbackItem2 = buildFeedback({ id: 'f2', revieweeId: 'user-2', published: false })

    const updatedItem1 = { ...feedbackItem1, published: true, publishedAt: new Date(), publishedBy: 'user-1' }
    const updatedItem2 = { ...feedbackItem2, published: true, publishedAt: new Date(), publishedBy: 'user-1' }

    mockSelect([feedbackItem1, feedbackItem2])
    mockSelect([{ id: 'user-2', buddyId: 'user-1' }])
    mockUpdate([updatedItem1, updatedItem2])

    const event = createAuthenticatedEvent({
      body: { feedbackIds: ['f1', 'f2'] },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      publishedCount: 2,
      feedback: [updatedItem1, updatedItem2],
    })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
