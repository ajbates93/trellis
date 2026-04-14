import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildCheckin, buildUser } from '#server/__tests__/helpers/factories'

const { mockDb } = createMockDb()

const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()

mockDb.query = {
  users: {
    findFirst: mockFindFirst,
    findMany: mockFindMany,
  },
  buddyCheckins: {
    findFirst: mockFindFirst,
    findMany: mockFindMany,
  },
}

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./buddy.get')

describe('GET /api/checkins/buddy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns empty array when user has no buddies assigned to them', async () => {
    // No filter — findMany for session user's buddies returns empty
    mockFindMany.mockResolvedValueOnce([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual([])
  })

  it('returns checkins for all buddies of the session user', async () => {
    const buddy = buildUser({ id: 'buddy-user-1', buddyId: 'user-1' })
    const checkin = buildCheckin({
      buddyId: 'user-1',
      userId: 'buddy-user-1',
    })

    const checkinWithRelations = {
      ...checkin,
      buddy: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
      user: { id: 'buddy-user-1', name: buddy.name, email: buddy.email, avatarUrl: null },
      reviewSchedule: null,
    }

    // First findMany: users where buddyId = session user
    mockFindMany.mockResolvedValueOnce([{ id: buddy.id }])
    // Second findMany: checkins for those buddies
    mockFindMany.mockResolvedValueOnce([checkinWithRelations])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as any[]

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('buddy-user-1')
    expect(result[0].buddyId).toBe('user-1')
  })

  it('returns checkins filtered by specific buddyId', async () => {
    const targetUser = buildUser({ id: 'buddy-user-1', buddyId: 'user-1' })
    const checkin = buildCheckin({ buddyId: 'user-1', userId: 'buddy-user-1' })

    const checkinWithRelations = {
      ...checkin,
      buddy: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
      user: { id: 'buddy-user-1', name: targetUser.name, email: targetUser.email, avatarUrl: null },
      reviewSchedule: null,
    }

    // findFirst: verify target user exists
    mockFindFirst.mockResolvedValueOnce(targetUser)
    // findMany: checkins for that specific user
    mockFindMany.mockResolvedValueOnce([checkinWithRelations])

    const event = createAuthenticatedEvent({
      query: { buddyId: 'buddy-user-1' },
    })

    const result = await handler(event) as any[]

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('buddy-user-1')
  })

  it('returns 404 when filtering by a buddyId that does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const event = createAuthenticatedEvent({
      query: { buddyId: 'nonexistent-user' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 403 when the target user is not a buddy of the session user', async () => {
    const targetUser = buildUser({ id: 'user-99', buddyId: 'someone-else' })

    mockFindFirst.mockResolvedValueOnce(targetUser)

    const event = createAuthenticatedEvent({
      query: { buddyId: 'user-99' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
