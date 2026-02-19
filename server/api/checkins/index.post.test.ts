import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'
import { buildCheckin, buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockInsert } = createMockDb()

const mockFindFirst = vi.fn()

mockDb.query = {
  users: {
    findFirst: mockFindFirst,
  },
  buddyCheckins: {
    findFirst: mockFindFirst,
  },
}

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/reviews', () => ({
  findNextReview: vi.fn().mockResolvedValue(null),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/checkins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('creates a checkin successfully', async () => {
    const targetUser = buildUser({ id: 'buddy-user-1', buddyId: 'user-1' })
    const createdCheckin = buildCheckin({
      id: 'checkin-1',
      buddyId: 'user-1',
      userId: 'buddy-user-1',
      notes: 'Great progress this week',
    })

    const checkinWithRelations = {
      ...createdCheckin,
      buddy: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatarUrl: null },
      user: { id: 'buddy-user-1', name: targetUser.name, email: targetUser.email, avatarUrl: null },
      reviewSchedule: null,
    }

    // findFirst: verify target user exists
    mockFindFirst.mockResolvedValueOnce(targetUser)

    // insert checkin
    mockInsert([{ id: 'checkin-1' }])

    // findFirst: fetch full checkin with relations
    mockFindFirst.mockResolvedValueOnce(checkinWithRelations)

    const event = createAuthenticatedEvent({
      body: { userId: 'buddy-user-1', notes: 'Great progress this week' },
    })

    const result = await handler(event) as any

    expect(result.success).toBe(true)
    expect(result.id).toBe('checkin-1')
    expect(result.notes).toBe('Great progress this week')
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('returns 404 when target user does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const event = createAuthenticatedEvent({
      body: { userId: 'nonexistent-user', notes: 'Some notes' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('returns 403 when session user is not the buddy of target user', async () => {
    const targetUser = buildUser({ id: 'user-99', buddyId: 'someone-else' })

    mockFindFirst.mockResolvedValueOnce(targetUser)

    const event = createAuthenticatedEvent({
      body: { userId: 'user-99', notes: 'Some notes' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 500 on database error during insert', async () => {
    const targetUser = buildUser({ id: 'buddy-user-1', buddyId: 'user-1' })

    mockFindFirst.mockResolvedValueOnce(targetUser)
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent({
      body: { userId: 'buddy-user-1', notes: 'Some notes' },
    })

    await expect(handler(event)).rejects.toThrow()
  })
})
