import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildUser } from '../../__tests__/helpers/factories'

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
const { default: handler } = await import('./[id].get')

describe('GET /api/buddies/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'user-2' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when buddy ID param is missing', async () => {
    const event = createAuthenticatedEvent({
      params: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Buddy ID is required',
    })
  })

  it('returns buddy profile when the current user is the assigned buddy', async () => {
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

    const event = createAuthenticatedEvent({
      params: { id: 'user-2' },
    })
    const result = await handler(event)

    expect(result).toEqual({ buddy: row })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns 403 when the current user is not the assigned buddy', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'user-2' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not authorized to view this buddy's profile",
    })
  })
})
