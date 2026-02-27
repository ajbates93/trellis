import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./leaderboard.get')

describe('GET /api/community/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const event = createUnauthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('includes users with no feedback at zero score', async () => {
    // First query: feedback rows
    mockSelect([])
    // Second query: workspace users
    mockSelect([
      { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null, image: null, roleType: 'dev' },
    ])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.leaderboard).toHaveLength(1)
    expect(result.leaderboard[0].userId).toBe('user-1')
    expect(result.leaderboard[0].totalScore).toBe(0)
    expect(result.period).toBe('12weeks')
  })

  it('ranks users by total score (consistency-based)', async () => {
    // User-1 has 3 weeks consecutive, 2 unique recipients
    // User-2 has 1 week, 1 unique recipient
    mockSelect([
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W03' },
      { reviewerId: 'user-1', revieweeId: 'user-3', weekYear: '2025-W04' },
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W05' },
      { reviewerId: 'user-2', revieweeId: 'user-1', weekYear: '2025-W05' },
    ])
    mockSelect([
      { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null, image: null, roleType: 'dev' },
      { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: null, image: null, roleType: 'design' },
    ])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.leaderboard.length).toBeGreaterThan(0)
    // Alice should rank higher due to longer streak and more variety
    expect(result.leaderboard[0].userId).toBe('user-1')
    expect(result.leaderboard[0].streakWeeks).toBe(3)
    expect(result.leaderboard[0].varietyCount).toBe(2)
  })

  it('accepts period query parameter', async () => {
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent({ query: { period: '4weeks' } })
    const result = await handler(event)

    expect(result.period).toBe('4weeks')
  })

  it('defaults to 12weeks for invalid period', async () => {
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent({ query: { period: 'invalid' } })
    const result = await handler(event)

    expect(result.period).toBe('12weeks')
  })

  it('ranks active users above zero-score users', async () => {
    mockSelect([
      { reviewerId: 'user-1', revieweeId: 'user-2', weekYear: '2025-W03' },
    ])
    mockSelect([
      { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null, image: null, roleType: 'dev' },
      { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: null, image: null, roleType: 'design' },
    ])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    // Both users appear, but user-1 ranks higher
    expect(result.leaderboard).toHaveLength(2)
    expect(result.leaderboard[0].userId).toBe('user-1')
    expect(result.leaderboard[1].userId).toBe('user-2')
    expect(result.leaderboard[1].totalScore).toBe(0)
  })

  it('throws 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
