import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildUser } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
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

  it('deletes user and all related data successfully', async () => {
    const userToDelete = buildUser({ id: 'user-abc' })
    const adminUser = buildUser({ id: 'admin-1', role: 'admin' })

    // 1. Select to fetch the user to delete
    mockSelect([userToDelete])
    // 2. Select to find the first admin for buddy reassignment
    mockSelect([adminUser])
    // 3. Delete feedback (reviewer or reviewee)
    mockDelete([])
    // 4. Delete goals
    mockDelete([])
    // 5. Delete review schedules
    mockDelete([])
    // 6. Update users whose buddy was the deleted user
    mockUpdate([])
    // 7. Delete the user record itself
    mockDelete([])

    const event = createAdminEvent({ params: { id: 'user-abc' } })
    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.delete).toHaveBeenCalledTimes(4)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('reassigns buddies to first admin when deleting a user who is someone\'s buddy', async () => {
    const userToDelete = buildUser({ id: 'user-abc' })
    const firstAdmin = buildUser({ id: 'admin-1', role: 'admin' })

    mockSelect([userToDelete])
    mockSelect([firstAdmin])
    mockDelete([])
    mockDelete([])
    mockDelete([])
    mockUpdate([])
    mockDelete([])

    const event = createAdminEvent({ params: { id: 'user-abc' } })
    await handler(event)

    // Verify update was called to reassign buddies
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('sets buddy to null when no admin exists for reassignment', async () => {
    const userToDelete = buildUser({ id: 'user-abc' })

    mockSelect([userToDelete])
    // No admin found
    mockSelect([])
    mockDelete([])
    mockDelete([])
    mockDelete([])
    mockUpdate([])
    mockDelete([])

    const event = createAdminEvent({ params: { id: 'user-abc' } })
    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })
})
