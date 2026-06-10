import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildFeedback, buildUser } from '#server/__tests__/helpers/factories'
import type { AnalysisResult } from '../../services/anthropicClient'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../services/anthropicClient', () => ({
  analyzeFeedback: vi.fn(),
}))

const { default: handler } = await import('./analyze.post')
const { analyzeFeedback } = await import('../../services/anthropicClient')

describe('POST /api/insights/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns cached analysis when a recent analysis exists (within 24 hours)', async () => {
    const cachedInsight = {
      id: 'insight-1',
      userId: 'user-1',
      analysisDate: new Date(),
      feedbackCount: 5,
      sentimentData: JSON.stringify({ positive: 0.8, neutral: 0.1, negative: 0.1 }),
      themes: JSON.stringify(['communication', 'teamwork']),
      suggestedGoals: JSON.stringify([{ goal: 'Improve communication' }]),
      status: 'completed',
    }

    // 1. Recent analysis query returns a cached result
    mockSelect([cachedInsight])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      status: 'cached',
      message: 'Analysis from last 24 hours returned',
    })
    expect(result.data).toBeDefined()
    expect(result.data?.feedbackCount).toBe(5)
    expect(analyzeFeedback).not.toHaveBeenCalled()
  })

  it('returns 400 when user has fewer than 3 pieces of feedback', async () => {
    // 1. No recent analysis
    mockSelect([])
    // 2. Feedback query returns fewer than 3 items
    mockSelect([
      { ...buildFeedback({ revieweeId: 'user-1', published: true }), reviewer: { name: 'Alice' } },
      { ...buildFeedback({ revieweeId: 'user-1', published: true }), reviewer: { name: 'Bob' } },
    ])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(analyzeFeedback).not.toHaveBeenCalled()
  })

  it('returns 400 when all feedback has null createdAt (filtered out, leaving < 3)', async () => {
    // 1. No recent analysis
    mockSelect([])
    // 2. Feedback with null createdAt (will be filtered out)
    mockSelect([
      { id: 'fb-1', content: 'Good', createdAt: null, reviewer: { name: 'Alice' } },
      { id: 'fb-2', content: 'Nice', createdAt: null, reviewer: { name: 'Bob' } },
      { id: 'fb-3', content: 'Great', createdAt: null, reviewer: { name: 'Carol' } },
    ])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('analyzes feedback successfully and stores the result', async () => {
    const now = new Date()
    const feedbackItems = [
      { id: 'fb-1', content: 'Excellent work', createdAt: now, reviewer: { name: 'Alice' } },
      { id: 'fb-2', content: 'Great teamwork', createdAt: now, reviewer: { name: 'Bob' } },
      { id: 'fb-3', content: 'Good communication', createdAt: now, reviewer: { name: 'Carol' } },
    ]

    const mockAnalysisResult = {
      sentimentData: { positive: 0.9, neutral: 0.1, negative: 0 },
      themes: ['communication', 'teamwork', 'quality'],
      suggestedGoals: [{ goal: 'Continue excellent work', priority: 'high' }],
    }

    const insertedInsight = {
      id: 'insight-new',
      userId: 'user-1',
      analysisDate: now,
      feedbackCount: 3,
      sentimentData: JSON.stringify(mockAnalysisResult.sentimentData),
      themes: JSON.stringify(mockAnalysisResult.themes),
      suggestedGoals: JSON.stringify(mockAnalysisResult.suggestedGoals),
      status: 'completed',
    }

    vi.mocked(analyzeFeedback).mockResolvedValueOnce(mockAnalysisResult as unknown as AnalysisResult)

    // 1. No recent analysis
    mockSelect([])
    // 2. Fetch received feedback (inner join)
    mockSelect(feedbackItems)
    // 3. Get user name
    mockSelect([{ name: 'Test User' }])
    // 4. Insert analysis result
    mockInsert([insertedInsight])
    // 5. Update user's lastInsightsDate
    mockUpdate([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      status: 'completed',
      message: 'Feedback analyzed successfully',
    })
    expect(result.data?.feedbackCount).toBe(3)
    expect(result.data?.sentimentData).toEqual(mockAnalysisResult.sentimentData)
    expect(analyzeFeedback).toHaveBeenCalledTimes(1)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when db insert fails to return an insight', async () => {
    const now = new Date()
    const feedbackItems = [
      { id: 'fb-1', content: 'Excellent work', createdAt: now, reviewer: { name: 'Alice' } },
      { id: 'fb-2', content: 'Great teamwork', createdAt: now, reviewer: { name: 'Bob' } },
      { id: 'fb-3', content: 'Good communication', createdAt: now, reviewer: { name: 'Carol' } },
    ]

    vi.mocked(analyzeFeedback).mockResolvedValueOnce({
      sentimentData: { positive: 0.9, neutral: 0.1, negative: 0 },
      themes: ['teamwork'],
      suggestedGoals: [],
    } as unknown as AnalysisResult)

    mockSelect([])
    mockSelect(feedbackItems)
    mockSelect([{ name: 'Test User' }])
    // Insert returns empty (no inserted insight)
    mockInsert([])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to store analysis',
    })
  })

  it('returns 500 when the database throws an unexpected error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('Connection timeout')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
