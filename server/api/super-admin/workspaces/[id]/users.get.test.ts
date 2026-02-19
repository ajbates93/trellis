import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import { createMockEvent } from '../../../../__tests__/helpers/mock-event'
import { buildWorkspace, buildUser } from '../../../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./users.get')

describe('GET /api/super-admin/workspaces/:id/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when id param is missing', async () => {
    const event = createMockEvent({ params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Workspace ID is required',
    })
  })

  it('returns 404 when workspace does not exist', async () => {
    // Workspace select returns empty
    mockSelect([])

    const event = createMockEvent({ params: { id: 'nonexistent-id' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Workspace not found',
    })
  })

  it('returns workspace info and users with correct status', async () => {
    const workspace = buildWorkspace({ id: 'ws-1', name: 'My Workspace' })
    const activeUser = buildUser({
      id: 'user-active',
      name: 'Active Person',
      email: 'active@example.com',
      role: 'user',
      roleType: 'dev',
      emailVerified: true,
      workspaceId: 'ws-1',
      avatarUrl: null,
      image: null,
      createdAt: new Date('2025-01-01'),
    })
    const invitedUser = buildUser({
      id: 'user-invited',
      name: 'Invited Person',
      email: 'invited@example.com',
      role: 'admin',
      roleType: 'management',
      emailVerified: false,
      workspaceId: 'ws-1',
      avatarUrl: 'https://example.com/avatar.png',
      image: null,
      createdAt: new Date('2025-02-01'),
    })

    // 1. Workspace existence check
    mockSelect([workspace])
    // 2. Users in workspace
    mockSelect([activeUser, invitedUser])

    const event = createMockEvent({ params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.workspace).toEqual({
      id: 'ws-1',
      name: 'My Workspace',
    })

    expect(result.users).toHaveLength(2)

    const active = result.users.find((u: any) => u.id === activeUser.id)
    expect(active).toBeDefined()
    expect(active!.status).toBe('active')

    const invited = result.users.find((u: any) => u.id === invitedUser.id)
    expect(invited).toBeDefined()
    expect(invited!.status).toBe('invited')
  })

  it('returns empty users array when workspace has no users', async () => {
    const workspace = buildWorkspace({ id: 'ws-empty', name: 'Empty Workspace' })

    mockSelect([workspace])
    mockSelect([])

    const event = createMockEvent({ params: { id: 'ws-empty' } })
    const result = await handler(event)

    expect(result.workspace).toEqual({
      id: 'ws-empty',
      name: 'Empty Workspace',
    })
    expect(result.users).toEqual([])
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('maps emailVerified true to status active', async () => {
    const workspace = buildWorkspace({ id: 'ws-1' })
    const user = buildUser({ emailVerified: true, workspaceId: 'ws-1' })

    mockSelect([workspace])
    mockSelect([user])

    const event = createMockEvent({ params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.users[0].status).toBe('active')
  })

  it('maps emailVerified false to status invited', async () => {
    const workspace = buildWorkspace({ id: 'ws-1' })
    const user = buildUser({ emailVerified: false, workspaceId: 'ws-1' })

    mockSelect([workspace])
    mockSelect([user])

    const event = createMockEvent({ params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.users[0].status).toBe('invited')
  })

  it('throws when database errors during workspace check', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createMockEvent({ params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toThrow('DB connection lost')
  })
})
