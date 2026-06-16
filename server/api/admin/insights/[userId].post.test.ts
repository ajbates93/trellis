import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../services/anthropicClient', () => ({
  analyzeFeedback: vi.fn().mockResolvedValue({
    sentimentData: { positive: 70, constructive: 20, neutral: 10 },
    themes: [{ name: 'teamwork', count: 3 }],
    suggestedGoals: [{ goalText: 'Improve collaboration', confidence: 0.8 }],
  }),
}))

const { default: handler } = await import('./[userId].post')

describe('POST /api/admin/insights/:userId', () => {
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

  it('returns 400 when not enough feedback', async () => {
    mockSelect([{ id: 'user-2', name: 'Test User' }]) // user exists
    mockSelect([{ id: 'f1', content: 'Good', createdAt: new Date(), reviewer: { name: 'R1' } }]) // only 1 feedback

    const event = createAdminEvent({ params: { userId: 'user-2' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('analyzes feedback successfully', async () => {
    mockSelect([{ id: 'user-2', name: 'Test User' }]) // user exists
    // 3 feedback items
    mockSelect([
      { id: 'f1', content: 'Great work', createdAt: new Date(), reviewer: { name: 'R1' } },
      { id: 'f2', content: 'Nice job', createdAt: new Date(), reviewer: { name: 'R2' } },
      { id: 'f3', content: 'Well done', createdAt: new Date(), reviewer: { name: 'R3' } },
    ])
    // Insert insight
    mockInsert([{
      analysisDate: new Date(),
      feedbackCount: 3,
    }])
    // Update user lastInsightsDate
    mockUpdate([])

    const event = createAdminEvent({ params: { userId: 'user-2' } })
    const result = await handler(event)

    expect(result.status).toBe('completed')
    expect(result.data?.sentimentData.positive).toBe(70)
  })
})
