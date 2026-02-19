import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
  createMockEvent,
} from '../../__tests__/helpers/mock-event'
import { buildWorkspace } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./current.get')

describe('GET /api/workspace/current', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns workspace: null when the session user has no workspaceId', async () => {
    // Create a session user without a workspaceId
    const event = createMockEvent({
      session: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          workspaceId: undefined,
        },
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ workspace: null })
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it('returns workspace data when workspaceId is present and workspace exists', async () => {
    const workspace = buildWorkspace({
      id: 'workspace-1',
      name: 'Test Workspace',
      logoUrl: 'https://example.com/logo.png',
    })

    mockSelect([{ id: workspace.id, name: workspace.name, logoUrl: workspace.logoUrl }])

    const event = createAuthenticatedEvent({
      session: { user: { id: 'user-1', email: 'test@example.com', name: 'Test User', workspaceId: 'workspace-1' } },
    })
    const result = await handler(event)

    expect(result).toEqual({
      workspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        logoUrl: 'https://example.com/logo.png',
      },
    })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns workspace: null when workspaceId is present but workspace is not found in DB', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      session: { user: { id: 'user-1', email: 'test@example.com', name: 'Test User', workspaceId: 'workspace-missing' } },
    })
    const result = await handler(event)

    expect(result).toEqual({ workspace: null })
  })
})
