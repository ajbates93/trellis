import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildUser } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 for non-admin users', async () => {
    const event = createAuthenticatedEvent({
      body: { name: 'New User', email: 'new@example.com' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 409 when a user with that email already exists', async () => {
    const existingUser = buildUser({ email: 'existing@example.com' })

    // Existing user check returns a match
    mockSelect([existingUser])

    const event = createAdminEvent({
      body: { name: 'New User', email: 'existing@example.com' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('creates a new user successfully', async () => {
    const newUser = buildUser({
      name: 'Alice Smith',
      email: 'alice@example.com',
      roleType: 'dev',
      buddyId: null,
      emailVerified: false,
      workspaceId: 'workspace-1',
    })

    // Existing user check returns no match
    mockSelect([])
    // Insert returns the new user
    mockInsert([newUser])

    const event = createAdminEvent({
      body: { name: 'Alice Smith', email: 'alice@example.com', roleType: 'dev' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      user: {
        ...newUser,
        buddyName: null,
        status: 'invited',
      },
    })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })

  it('creates a user with a buddy assignment', async () => {
    const newUser = buildUser({
      name: 'Bob Jones',
      email: 'bob@example.com',
      roleType: 'qa',
      buddyId: 'admin-1',
      emailVerified: false,
      workspaceId: 'workspace-1',
    })

    mockSelect([])
    mockInsert([newUser])

    const event = createAdminEvent({
      body: { name: 'Bob Jones', email: 'bob@example.com', roleType: 'qa', buddyId: 'admin-1' },
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.user.buddyId).toBe('admin-1')
    expect(result.user.status).toBe('invited')
  })
})
