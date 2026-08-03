import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./team-summary.get')

describe('GET /api/admin/insights/team-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 403 for non-admin', async () => {
    const event = createAuthenticatedEvent()
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns summary with no analysis data', async () => {
    // All users query
    mockSelect([
      { id: 'u1', name: 'User 1', avatarUrl: null, image: null, roleType: 'dev' },
    ])
    // Batched insights query for all users (none)
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result.totalUsers).toBe(1)
    expect(result.usersWithAnalysis).toBe(0)
    expect(result.aggregateSentiment).toBeNull()
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns summary with analysis data', async () => {
    mockSelect([
      { id: 'u1', name: 'User 1', avatarUrl: null, image: null, roleType: 'dev' },
    ])
    // Batched insights query, returning rows tagged with userId
    mockSelect([{
      userId: 'u1',
      sentimentData: '{"positive":60,"constructive":30,"neutral":10}',
      analysisDate: new Date('2025-01-15'),
      feedbackCount: 5,
    }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result.totalUsers).toBe(1)
    expect(result.usersWithAnalysis).toBe(1)
    expect(result.aggregateSentiment).toEqual({ positive: 60, constructive: 30, neutral: 10 })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('batches insights into a single query regardless of user count (no N+1)', async () => {
    // All users query - three users
    mockSelect([
      { id: 'u1', name: 'User 1', avatarUrl: null, image: null, roleType: 'dev' },
      { id: 'u2', name: 'User 2', avatarUrl: null, image: null, roleType: 'design' },
      { id: 'u3', name: 'User 3', avatarUrl: null, image: null, roleType: 'qa' },
    ])
    // ONE batched insights query returning rows for multiple users, most recent first
    mockSelect([
      {
        userId: 'u1',
        sentimentData: '{"positive":70,"constructive":20,"neutral":10}',
        analysisDate: new Date('2025-02-01'),
        feedbackCount: 4,
      },
      {
        userId: 'u1',
        sentimentData: '{"positive":50,"constructive":30,"neutral":20}',
        analysisDate: new Date('2025-01-01'),
        feedbackCount: 3,
      },
      {
        userId: 'u2',
        sentimentData: '{"positive":40,"constructive":40,"neutral":20}',
        analysisDate: new Date('2025-01-20'),
        feedbackCount: 2,
      },
    ])

    const event = createAdminEvent()
    const result = await handler(event)

    // Only two select calls total: users + one batched insights query, no per-user loop
    expect(mockDb.select).toHaveBeenCalledTimes(2)

    expect(result.totalUsers).toBe(3)
    expect(result.usersWithAnalysis).toBe(2)
    expect(result.usersWithoutAnalysis).toBe(1)

    const u1 = result.users.find((u) => u.userId === 'u1')
    expect(u1?.currentSentiment).toEqual({ positive: 70, constructive: 20, neutral: 10 })
    expect(u1?.trend).toBe('improving')
    expect(u1?.feedbackCount).toBe(4)

    const u2 = result.users.find((u) => u.userId === 'u2')
    expect(u2?.currentSentiment).toEqual({ positive: 40, constructive: 40, neutral: 20 })
    expect(u2?.trend).toBe('new')

    const u3 = result.users.find((u) => u.userId === 'u3')
    expect(u3?.currentSentiment).toBeNull()
    expect(u3?.dominantSentiment).toBe('none')
  })
})
