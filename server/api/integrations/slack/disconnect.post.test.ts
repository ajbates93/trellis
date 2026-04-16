import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./disconnect.post')

describe('POST /api/integrations/slack/disconnect', () => {
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
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 403 for regular user with isSuperAdmin=false', async () => {
    const event = createAuthenticatedEvent({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
        workspaceId: 'workspace-1',
        isSuperAdmin: false,
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('disconnects slack integration successfully for admin', async () => {
    mockDelete([{ id: 'slack-ws-1', workspaceId: 'workspace-1' }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: 'Slack integration disconnected successfully',
    })
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })

  it('disconnects slack integration successfully for superAdmin', async () => {
    mockDelete([{ id: 'slack-ws-1', workspaceId: 'workspace-1' }])

    const event = createAuthenticatedEvent({
      session: {
        user: {
          id: 'super-1',
          email: 'super@example.com',
          name: 'Super Admin',
          role: 'user',
          workspaceId: 'workspace-1',
          isSuperAdmin: true,
        },
      },
    })
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: 'Slack integration disconnected successfully',
    })
  })

  it('returns 404 when no Slack integration found (catch re-throws with statusCode)', async () => {
    // delete returns empty array = no integration found
    mockDelete([])

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.delete.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
