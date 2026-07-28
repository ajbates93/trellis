import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    invitation: vi.fn().mockReturnValue('<html>invite</html>'),
  },
}))

// Mock readBody globally since this endpoint uses it directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./send-bulk-invitations.post')
const { sendEmail } = await import('../../../utils/email')

describe('POST /api/admin/onboard/send-bulk-invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default sendEmail behaviour after clearAllMocks resets it
    vi.mocked(sendEmail).mockResolvedValue({ suppressed: true } as const)
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 when user is not an admin', async () => {
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Admin access required',
    })
  })

  it('returns 400 when userIds is not an array', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: 'not-an-array' })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'userIds array is required',
    })
  })

  it('returns 400 when userIds is an empty array', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: [] })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'userIds array is required',
    })
  })

  it('returns 404 when no pre-created users are found', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['nonexistent-1', 'nonexistent-2'] })
    // DB returns no pre-created users
    mockSelect([])

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'No pre-created users found',
    })
  })

  it('sends invitations to all found pre-created users', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['pre-user-1', 'pre-user-2'] })

    const user1 = buildUser({ id: 'pre-user-1', email: 'alice@example.com', name: 'Alice Brown', emailVerified: false })
    const user2 = buildUser({ id: 'pre-user-2', email: 'bob@example.com', name: 'Bob Jones', emailVerified: false })

    mockSelect([user1, user2])
    // Two verification token inserts
    mockInsert([])
    mockInsert([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      sent: 2,
      failed: 0,
      details: {
        sent: [user1.email, user2.email],
        failed: [],
      },
    })
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('sends invitation to a single pre-created user', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['pre-user-3'] })

    const user = buildUser({ id: 'pre-user-3', email: 'charlie@example.com', name: 'Charlie Davis', emailVerified: false })

    mockSelect([user])
    mockInsert([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      success: true,
      sent: 1,
      failed: 0,
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: 'Welcome to Trellis - Set Your Password',
      })
    )
  })

  it('records failed sends and reports partial success', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['pre-user-4', 'pre-user-5'] })

    const user1 = buildUser({ id: 'pre-user-4', email: 'dave@example.com', name: 'Dave Evans', emailVerified: false })
    const user2 = buildUser({ id: 'pre-user-5', email: 'eve@example.com', name: 'Eve Foster', emailVerified: false })

    mockSelect([user1, user2])

    // Both inserts succeed; sendEmail fails for the second user
    mockInsert([])
    mockInsert([])
    vi.mocked(sendEmail)
      .mockResolvedValueOnce({ suppressed: true } as const)
      .mockRejectedValueOnce(new Error('SMTP failure'))

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      sent: 1,
      failed: 1,
      details: {
        sent: [user1.email],
        failed: expect.arrayContaining([
          expect.objectContaining({ email: user2.email }),
        ]),
      },
    })
  })

  it('allows super admin to send bulk invitations', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['pre-user-6'] })

    const user = buildUser({ id: 'pre-user-6', email: 'frank@example.com', name: 'Frank Green', emailVerified: false })

    mockSelect([user])
    mockInsert([])

    const event = createAuthenticatedEvent({
      session: {
        user: {
          id: 'super-1',
          email: 'super@example.com',
          name: 'Super Admin',
          role: 'user',
          isSuperAdmin: true,
        },
      },
    })
    const result = await handler(event)

    expect(result).toMatchObject({ success: true, sent: 1 })
  })

  it('inserts verification tokens for each user', async () => {
    mockReadBody.mockResolvedValueOnce({ userIds: ['pre-user-7', 'pre-user-8'] })

    const user1 = buildUser({ id: 'pre-user-7', email: 'grace@example.com', name: 'Grace Hall', emailVerified: false })
    const user2 = buildUser({ id: 'pre-user-8', email: 'henry@example.com', name: 'Henry Ives', emailVerified: false })

    mockSelect([user1, user2])
    mockInsert([])
    mockInsert([])

    const event = createAdminEvent()
    await handler(event)

    // One insert per user for the verification token
    expect(mockDb.insert).toHaveBeenCalledTimes(2)
  })
})
