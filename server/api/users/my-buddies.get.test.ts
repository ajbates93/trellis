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
const { default: handler } = await import('./my-buddies.get')

describe('GET /api/users/my-buddies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns buddy list for the current user', async () => {
    const buddy = buildUser({
      id: 'user-2',
      buddyId: 'user-1',
    })

    const row = {
      id: buddy.id,
      name: buddy.name,
      email: buddy.email,
      avatarUrl: buddy.avatarUrl,
      roleType: buddy.roleType,
      preferredName: buddy.preferredName,
      pronouns: buddy.pronouns,
      bio: buddy.bio,
      reviewPreference: buddy.reviewPreference,
      communicationPreferences: buddy.communicationPreferences,
      createdAt: buddy.createdAt,
    }
    mockSelect([row])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ buddies: [row] })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty array when the current user has no buddies', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ buddies: [] })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
