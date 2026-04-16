import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

// Import handler after mocks are set up
const { default: handler } = await import('./index.get')

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns users list for the current workspace', async () => {
    const user1 = buildUser({ id: 'user-1', workspaceId: 'workspace-1' })
    const user2 = buildUser({ id: 'user-2', workspaceId: 'workspace-1' })

    const rows = [
      {
        id: user1.id,
        name: user1.name,
        email: user1.email,
        image: user1.image,
        avatarUrl: user1.avatarUrl,
        roleType: user1.roleType,
      },
      {
        id: user2.id,
        name: user2.name,
        email: user2.email,
        image: user2.image,
        avatarUrl: user2.avatarUrl,
        roleType: user2.roleType,
      },
    ]
    mockSelect(rows)

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ users: rows })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty array when no users are in the workspace', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ users: [] })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
