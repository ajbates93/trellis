import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createAdminEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./status.get')

describe('GET /api/integrations/slack/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns slack connection status and isAdmin=true for admin user when slack is connected', async () => {
    const slackWorkspaceRecord = {
      id: 'slack-ws-1',
      slackTeamId: 'T12345',
      slackTeamName: 'Test Team',
      installedAt: new Date('2025-01-10'),
      installedBy: 'admin-1',
    }

    mockSelect([slackWorkspaceRecord])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({
      slackWorkspace: slackWorkspaceRecord,
      isAdmin: true,
    })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns null slackWorkspace and isAdmin=false for regular user when slack is not connected', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      slackWorkspace: null,
      isAdmin: false,
    })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns isAdmin=true for superAdmin user', async () => {
    mockSelect([])

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
      slackWorkspace: null,
      isAdmin: true,
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
