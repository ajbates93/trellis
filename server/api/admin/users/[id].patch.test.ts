import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildUser } from '../../../__tests__/helpers/factories'

const { mockDb, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./[id].patch')

describe('PATCH /api/admin/users/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { id: 'user-abc' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 for non-admin users', async () => {
    const event = createAuthenticatedEvent({
      params: { id: 'user-abc' },
      body: { role: 'admin' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 404 when user is not found', async () => {
    // Update returns an empty result (no matching row)
    mockUpdate([])

    const event = createAdminEvent({
      params: { id: 'nonexistent-id' },
      body: { roleType: 'design' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('updates user fields successfully', async () => {
    const updatedUser = buildUser({
      id: 'user-abc',
      roleType: 'design',
      role: 'admin',
      emailVerified: true,
    })

    mockUpdate([updatedUser])

    const event = createAdminEvent({
      params: { id: 'user-abc' },
      body: { roleType: 'design', role: 'admin' },
    })

    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      user: {
        ...updatedUser,
        buddyName: null,
        status: 'active',
      },
    })
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('sets status to invited when emailVerified is false', async () => {
    const updatedUser = buildUser({
      id: 'user-abc',
      emailVerified: false,
      banned: true,
    })

    mockUpdate([updatedUser])

    const event = createAdminEvent({
      params: { id: 'user-abc' },
      body: { banned: true },
    })

    const result = await handler(event)

    expect(result.user.status).toBe('invited')
  })

  it('updates buddy assignment', async () => {
    const updatedUser = buildUser({
      id: 'user-abc',
      buddyId: 'admin-1',
      emailVerified: true,
    })

    mockUpdate([updatedUser])

    const event = createAdminEvent({
      params: { id: 'user-abc' },
      body: { buddyId: 'admin-1' },
    })

    const result = await handler(event)

    expect(result.user.buddyId).toBe('admin-1')
    expect(result.success).toBe(true)
  })

  it('updates nextReviewDate', async () => {
    const reviewDate = new Date('2025-06-01')
    const updatedUser = buildUser({
      id: 'user-abc',
      nextReviewDate: reviewDate,
      emailVerified: true,
    })

    mockUpdate([updatedUser])

    const event = createAdminEvent({
      params: { id: 'user-abc' },
      body: { nextReviewDate: '2025-06-01' },
    })

    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })
})
