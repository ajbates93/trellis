import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert, mockUpdate, mockDelete } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

// Mock readBody globally since this endpoint uses it directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./set-password.post')

describe('POST /api/auth/set-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when missing fields', async () => {
    mockReadBody.mockResolvedValueOnce({ email: 'test@example.com' })

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when password too short', async () => {
    mockReadBody.mockResolvedValueOnce({
      email: 'test@example.com', password: 'short', token: 'abc',
    })

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when token invalid', async () => {
    mockReadBody.mockResolvedValueOnce({
      email: 'test@example.com', password: 'validpass123', token: 'bad-token',
    })
    mockSelect([])

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired invitation link',
    })
  })

  it('returns 400 when token expired', async () => {
    mockReadBody.mockResolvedValueOnce({
      email: 'test@example.com', password: 'validpass123', token: 'good-token',
    })
    mockSelect([{
      id: 'v-1',
      identifier: 'test@example.com',
      value: 'good-token',
      expiresAt: new Date('2020-01-01'),
    }])
    mockDelete([])

    const event = createMockEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('sets password successfully', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    mockReadBody.mockResolvedValueOnce({
      email: 'test@example.com', password: 'validpass123', token: 'good-token',
    })
    mockSelect([{
      id: 'v-1',
      identifier: 'test@example.com',
      value: 'good-token',
      expiresAt: futureDate,
    }])
    mockSelect([buildUser({ id: 'user-1', email: 'test@example.com', emailVerified: false })])
    mockInsert([])
    mockUpdate([])
    mockDelete([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: 'Password set successfully',
    })
  })
})
