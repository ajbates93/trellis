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
vi.mock('../../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))
vi.mock('../../../utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    invitation: vi.fn().mockReturnValue('<html>invite</html>'),
  },
}))

// Mock readBody globally since this endpoint uses it directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./send-invitation.post')
const { auth } = await import('../../../utils/auth')
const { sendEmail } = await import('../../../utils/email')

describe('POST /api/admin/onboard/send-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default sendEmail behaviour after clearAllMocks resets it
    vi.mocked(sendEmail).mockResolvedValue(undefined)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any)

    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 when user is not an admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', email: 'user@example.com', name: 'Regular User', role: 'user' },
    } as any)

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Admin access required',
    })
  })

  it('returns 400 when userId is missing from body', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)
    mockReadBody.mockResolvedValueOnce({})

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'userId is required',
    })
  })

  it('returns 404 when user is not found or already activated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ userId: 'nonexistent-user' })
    // DB returns no pre-created user
    mockSelect([])

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found or already activated',
    })
  })

  it('sends invitation successfully for a pre-created user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ userId: 'pre-user-1' })

    const preCreatedUser = buildUser({
      id: 'pre-user-1',
      email: 'jane@example.com',
      name: 'Jane Smith',
      emailVerified: false,
    })
    // DB returns pre-created user
    mockSelect([preCreatedUser])
    // Insert verification token
    mockInsert([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: `Invitation sent to ${preCreatedUser.email}`,
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: preCreatedUser.email,
        subject: 'Welcome to Trellis - Set Your Password',
      })
    )
  })

  it('stores a verification token in the database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)
    mockReadBody.mockResolvedValueOnce({ userId: 'pre-user-2' })

    const preCreatedUser = buildUser({
      id: 'pre-user-2',
      email: 'alice@example.com',
      name: 'Alice Brown',
      emailVerified: false,
    })
    mockSelect([preCreatedUser])
    mockInsert([])

    const event = createAdminEvent()
    await handler(event)

    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('allows super admin to send invitations', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'super-1',
        email: 'super@example.com',
        name: 'Super Admin',
        role: 'user',
        isSuperAdmin: true,
      },
    } as any)
    mockReadBody.mockResolvedValueOnce({ userId: 'pre-user-3' })

    const preCreatedUser = buildUser({
      id: 'pre-user-3',
      email: 'bob@example.com',
      name: 'Bob Jones',
      emailVerified: false,
    })
    mockSelect([preCreatedUser])
    mockInsert([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({ success: true })
  })
})
