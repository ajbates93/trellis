import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

const mockAssertNotSoleAdmin = vi.fn().mockResolvedValue(undefined)
const mockAnonymizeUser = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))
vi.mock('../../../utils/accountDeletion', () => ({
  assertNotSoleAdmin: mockAssertNotSoleAdmin,
  anonymizeUser: mockAnonymizeUser,
}))

const { default: handler } = await import('./[id].delete')

describe('DELETE /api/admin/users/:id', () => {
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
    const event = createAuthenticatedEvent({ params: { id: 'user-abc' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 400 when admin tries to delete their own account', async () => {
    // The admin user id is 'admin-1' (from createAdminEvent)
    const event = createAdminEvent({ params: { id: 'admin-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Cannot delete your own account'),
    })
  })

  it('returns 404 when user does not exist', async () => {
    // Select for the user to delete returns no results
    mockSelect([])

    const event = createAdminEvent({ params: { id: 'nonexistent-id' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('anonymizes the user instead of hard-deleting', async () => {
    const userToDelete = buildUser({ id: 'user-abc' })

    // Select to fetch the user to delete (workspace-scoped lookup)
    mockSelect([userToDelete])

    const event = createAdminEvent({ params: { id: 'user-abc' } })
    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockAssertNotSoleAdmin).toHaveBeenCalledWith('user-abc', 'workspace-1')
    expect(mockAnonymizeUser).toHaveBeenCalledWith('user-abc')
    const assertOrder = mockAssertNotSoleAdmin.mock.invocationCallOrder[0]
    const anonymizeOrder = mockAnonymizeUser.mock.invocationCallOrder[0]
    expect(assertOrder).toBeDefined()
    expect(anonymizeOrder).toBeDefined()
    expect(assertOrder as number).toBeLessThan(anonymizeOrder as number)
  })

  it('propagates the sole-admin guard error without anonymizing', async () => {
    const userToDelete = buildUser({ id: 'user-abc', role: 'admin' })
    mockSelect([userToDelete])
    mockAssertNotSoleAdmin.mockRejectedValueOnce({
      statusCode: 400,
      message: 'You are the only admin in this workspace. Assign another admin before deleting this account.',
    })

    const event = createAdminEvent({ params: { id: 'user-abc' } })

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mockAnonymizeUser).not.toHaveBeenCalled()
  })
})
