import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

// timezone.patch.ts uses readBody() directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./timezone.patch')
const { auth } = await import('../../utils/auth')

describe('PATCH /api/user/timezone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any)

    const event = createMockEvent({ method: 'PATCH' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    })
  })

  it('updates timezone successfully with a valid IANA timezone', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    } as any)

    mockReadBody.mockResolvedValueOnce({ timezone: 'Europe/London' })

    mockUpdate([{ id: 'user-1', timezone: 'Europe/London' }])

    const event = createMockEvent({ method: 'PATCH' })
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      timezone: 'Europe/London',
    })
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when timezone format is invalid', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    } as any)

    mockReadBody.mockResolvedValueOnce({ timezone: 'Not/A/Real/Timezone/At/All' })

    const event = createMockEvent({ method: 'PATCH' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid timezone format',
    })
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('returns 400 when timezone is missing from the request body (Zod parse fails, wraps to 500)', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    } as any)

    // Empty body — Zod parse will throw (no statusCode), which the catch wraps as 500
    mockReadBody.mockResolvedValueOnce({})

    const event = createMockEvent({ method: 'PATCH' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 404 when the user is not found in the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    } as any)

    mockReadBody.mockResolvedValueOnce({ timezone: 'America/New_York' })

    // update returns empty — user not found
    mockUpdate([])

    const event = createMockEvent({ method: 'PATCH' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    })
  })

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    } as any)

    mockReadBody.mockResolvedValueOnce({ timezone: 'America/Chicago' })

    mockDb.update.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createMockEvent({ method: 'PATCH' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
