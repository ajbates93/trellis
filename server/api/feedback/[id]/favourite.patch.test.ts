import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

// favourite.patch.ts uses readBody() directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./favourite.patch')

describe('PATCH /api/feedback/:id/favourite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'feedback-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 400 when id param is missing', async () => {
    const event = createAuthenticatedEvent({
      params: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Feedback ID is required',
    })
  })

  it('returns 400 when isFavourite body is missing or not boolean', async () => {
    mockReadBody.mockResolvedValueOnce({})

    const event = createAuthenticatedEvent({
      params: { id: 'f1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'isFavourite must be a boolean',
    })
  })

  it('returns 404 when feedback is not found', async () => {
    mockReadBody.mockResolvedValueOnce({ isFavourite: true })
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'feedback-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Feedback not found',
    })
  })

  it('returns 403 when user is not the reviewee', async () => {
    mockReadBody.mockResolvedValueOnce({ isFavourite: true })
    mockSelect([{ id: 'f1', revieweeId: 'other-user' }])

    const event = createAuthenticatedEvent({
      params: { id: 'f1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'You can only favourite your own feedback',
    })
  })

  it('updates and returns feedback when reviewee sets favourite', async () => {
    mockReadBody.mockResolvedValueOnce({ isFavourite: true })
    mockSelect([{ id: 'f1', revieweeId: 'user-1' }])
    mockUpdate([{ id: 'f1', revieweeId: 'user-1', isFavourite: true }])

    const event = createAuthenticatedEvent({
      params: { id: 'f1' },
    })

    const result = await handler(event)
    expect(result).toMatchObject({
      success: true,
      feedback: { id: 'f1', isFavourite: true },
    })
  })

  it('updates and returns feedback when reviewee unsets favourite', async () => {
    mockReadBody.mockResolvedValueOnce({ isFavourite: false })
    mockSelect([{ id: 'f1', revieweeId: 'user-1' }])
    mockUpdate([{ id: 'f1', revieweeId: 'user-1', isFavourite: false }])

    const event = createAuthenticatedEvent({
      params: { id: 'f1' },
    })

    const result = await handler(event)
    expect(result).toMatchObject({
      success: true,
      feedback: { id: 'f1', isFavourite: false },
    })
  })
})
