import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./user-summary.get')

describe('GET /api/insights/user-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns hasAnalysis: false when no analysis exists', async () => {
    // Latest analysis query returns nothing
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      hasAnalysis: false,
      data: null,
    })
    expect(result.message).toBeTruthy()
    // No second query should happen
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns hasAnalysis: false when analysis has a null analysisDate', async () => {
    const analysisWithNullDate = {
      id: 'insight-1',
      userId: 'user-1',
      analysisDate: null,
      feedbackCount: 5,
      sentimentData: JSON.stringify({ positive: 0.8, neutral: 0.1, negative: 0.1 }),
      themes: JSON.stringify(['communication']),
      suggestedGoals: null,
      status: 'completed',
    }

    mockSelect([analysisWithNullDate])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      hasAnalysis: false,
      data: null,
    })
  })

  it('returns full analysis summary when analysis exists', async () => {
    const analysisDate = new Date('2025-01-10T12:00:00Z')
    const analysis = {
      id: 'insight-1',
      userId: 'user-1',
      analysisDate,
      feedbackCount: 7,
      sentimentData: JSON.stringify({ positive: 0.75, neutral: 0.2, negative: 0.05 }),
      themes: JSON.stringify(['leadership', 'communication', 'delivery']),
      suggestedGoals: JSON.stringify([{ goal: 'Improve leadership skills', priority: 'high' }]),
      status: 'completed',
    }

    // 1. Latest analysis query
    mockSelect([analysis])
    // 2. New feedback since analysis query
    mockSelect([{ id: 'fb-new-1' }, { id: 'fb-new-2' }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toMatchObject({
      hasAnalysis: true,
      feedbackCount: 7,
      newFeedbackSinceAnalysis: 2,
    })
    expect(result.data).toBeDefined()
    expect(result.data?.themes).toEqual(['leadership', 'communication', 'delivery'])
    expect(result.data?.sentimentData).toEqual({ positive: 0.75, neutral: 0.2, negative: 0.05 })
    expect(result.data?.suggestedGoals).toHaveLength(1)
    expect(result.lastAnalyzed).toEqual(analysisDate)
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns suggestedGoals as empty array when field is null', async () => {
    const analysisDate = new Date('2025-01-10T12:00:00Z')
    const analysis = {
      id: 'insight-2',
      userId: 'user-1',
      analysisDate,
      feedbackCount: 4,
      sentimentData: JSON.stringify({ positive: 0.6, neutral: 0.3, negative: 0.1 }),
      themes: JSON.stringify(['teamwork']),
      suggestedGoals: null,
      status: 'completed',
    }

    mockSelect([analysis])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.data?.suggestedGoals).toEqual([])
  })

  it('returns 500 when the database throws an error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch feedback insights',
    })
  })
})
