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

const { default: handler } = await import('./[userId].get')

describe('GET /api/admin/insights/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({ params: { userId: 'user-2' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 403 for non-admin', async () => {
    const event = createAuthenticatedEvent({ params: { userId: 'user-2' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns 404 when user not found', async () => {
    mockSelect([]) // user lookup
    const event = createAdminEvent({ params: { userId: 'user-999' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns no analysis when none exists', async () => {
    mockSelect([{ id: 'user-2', name: 'Test User' }]) // user exists
    mockSelect([]) // no analysis

    const event = createAdminEvent({ params: { userId: 'user-2' } })
    const result = await handler(event)

    expect(result.hasAnalysis).toBe(false)
    expect(result.data).toBeNull()
  })

  it('returns analysis with data', async () => {
    mockSelect([{ id: 'user-2', name: 'Test User' }]) // user exists
    mockSelect([{
      id: 'insight-1',
      userId: 'user-2',
      analysisDate: new Date('2025-01-15'),
      feedbackCount: 5,
      feedbackIds: '["f1","f2"]',
      sentimentData: '{"positive":60,"constructive":30,"neutral":10}',
      themes: '[{"name":"communication","count":3}]',
      suggestedGoals: '[{"goalText":"Improve docs"}]',
      status: 'completed',
    }]) // latest analysis
    mockSelect([]) // new feedback since analysis

    const event = createAdminEvent({ params: { userId: 'user-2' } })
    const result = await handler(event)

    expect(result.hasAnalysis).toBe(true)
    expect(result.feedbackCount).toBe(5)
    expect(result.data.sentimentData.positive).toBe(60)
  })
})
