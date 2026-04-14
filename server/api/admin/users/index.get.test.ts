import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./index.get')

describe('GET /api/admin/users', () => {
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

  it('returns users list with buddy names and counts', async () => {
    const userWithBuddy = buildUser({ id: 'user-a', buddyId: 'user-b', emailVerified: true })
    const userWithoutBuddy = buildUser({ id: 'user-b', buddyId: null, emailVerified: false })

    // 1. Main user list select
    mockSelect([userWithBuddy, userWithoutBuddy])
    // 2. Buddy name lookup for userWithBuddy (buddyId = 'user-b')
    mockSelect([{ name: userWithoutBuddy.name }])
    // 3. Total count
    mockSelect([{ count: 2 }])
    // 4. Active count
    mockSelect([{ count: 1 }])
    // 5. Invited count
    mockSelect([{ count: 1 }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      users: expect.arrayContaining([
        expect.objectContaining({
          id: 'user-a',
          buddyName: userWithoutBuddy.name,
          status: 'active',
        }),
        expect.objectContaining({
          id: 'user-b',
          buddyName: null,
          status: 'invited',
        }),
      ]),
      counts: {
        all: 2,
        active: 1,
        invited: 1,
      },
    })
    expect(mockDb.select).toHaveBeenCalledTimes(5)
  })

  it('returns users list with no buddy lookups when no buddyIds are set', async () => {
    const user1 = buildUser({ buddyId: null, emailVerified: true })
    const user2 = buildUser({ buddyId: null, emailVerified: true })

    // 1. Main user list
    mockSelect([user1, user2])
    // 2. Total count
    mockSelect([{ count: 2 }])
    // 3. Active count
    mockSelect([{ count: 2 }])
    // 4. Invited count
    mockSelect([{ count: 0 }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      users: expect.arrayContaining([
        expect.objectContaining({ buddyName: null, status: 'active' }),
      ]),
      counts: { all: 2, active: 2, invited: 0 },
    })
    // No buddy lookups — only 4 selects total
    expect(mockDb.select).toHaveBeenCalledTimes(4)
  })

  it('filters by active status when filter=active query param is provided', async () => {
    const activeUser = buildUser({ emailVerified: true, buddyId: null })

    mockSelect([activeUser])
    mockSelect([{ count: 3 }])
    mockSelect([{ count: 2 }])
    mockSelect([{ count: 1 }])

    const event = createAdminEvent({ query: { filter: 'active' } })
    const result = await handler(event)

    expect(result.users).toHaveLength(1)
    expect(result.users[0]).toMatchObject({ status: 'active' })
  })

  it('filters by invited status when filter=invited query param is provided', async () => {
    const invitedUser = buildUser({ emailVerified: false, buddyId: null })

    mockSelect([invitedUser])
    mockSelect([{ count: 3 }])
    mockSelect([{ count: 2 }])
    mockSelect([{ count: 1 }])

    const event = createAdminEvent({ query: { filter: 'invited' } })
    const result = await handler(event)

    expect(result.users).toHaveLength(1)
    expect(result.users[0]).toMatchObject({ status: 'invited' })
  })
})
