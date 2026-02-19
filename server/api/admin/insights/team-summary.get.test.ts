import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'

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
    // Analyses for user 1 (none)
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result.totalUsers).toBe(1)
    expect(result.usersWithAnalysis).toBe(0)
    expect(result.aggregateSentiment).toBeNull()
  })

  it('returns summary with analysis data', async () => {
    mockSelect([
      { id: 'u1', name: 'User 1', avatarUrl: null, image: null, roleType: 'dev' },
    ])
    // Analyses for user 1
    mockSelect([{
      sentimentData: '{"positive":60,"constructive":30,"neutral":10}',
      analysisDate: new Date('2025-01-15'),
      feedbackCount: 5,
    }])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result.totalUsers).toBe(1)
    expect(result.usersWithAnalysis).toBe(1)
    expect(result.aggregateSentiment).toEqual({ positive: 60, constructive: 30, neutral: 10 })
  })
})
