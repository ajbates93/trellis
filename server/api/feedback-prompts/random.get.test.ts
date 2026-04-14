import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./random.get')

describe('GET /api/feedback-prompts/random', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns a random prompt when active prompts exist', async () => {
    const prompt = {
      id: 'prompt-1',
      question: 'How has this person demonstrated leadership recently?',
      category: 'leadership',
    }

    mockSelect([prompt])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ prompt })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when no active prompts exist (404 inside try/catch wraps to 500)', async () => {
    // The 404 createError is thrown inside the try block and the catch
    // wraps ALL errors as 500 regardless of statusCode
    mockSelect([])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch feedback prompt',
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB error')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch feedback prompt',
    })
  })
})
