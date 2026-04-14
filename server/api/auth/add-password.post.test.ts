import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))
vi.mock('../../utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

// Mock readBody globally since this endpoint uses it directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./add-password.post')
const { auth } = await import('../../utils/auth')

describe('POST /api/auth/add-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any)

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when password missing', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any)
    mockReadBody.mockResolvedValueOnce({})

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when password too short', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ password: 'short' })

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when password already set', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ password: 'validpassword123' })
    mockSelect([{ id: 'acc-1', providerId: 'credential' }])

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Password already set. Use change password instead.',
    })
  })

  it('adds password successfully', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@example.com' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ password: 'validpassword123' })
    mockSelect([])
    mockInsert([])
    mockUpdate([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: 'Password set successfully',
    })
  })
})
