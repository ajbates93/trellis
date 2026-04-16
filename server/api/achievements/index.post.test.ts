import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildAchievement } from '#server/__tests__/helpers/factories'

const { mockDb, mockInsert } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('creates an achievement successfully', async () => {
    const newAchievement = buildAchievement({
      userId: 'user-1',
      title: 'Shipped v1.0',
      achievedDate: '2025-03-01',
    })

    mockInsert([newAchievement])

    const event = createAuthenticatedEvent({
      body: {
        title: 'Shipped v1.0',
        achievedDate: '2025-03-01',
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ achievement: newAchievement })
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('creates an achievement with optional description', async () => {
    const newAchievement = buildAchievement({
      userId: 'user-1',
      title: 'Led team offsite',
      description: '<p>Organized and led the quarterly offsite.</p>',
      achievedDate: '2025-02-15',
    })

    mockInsert([newAchievement])

    const event = createAuthenticatedEvent({
      body: {
        title: 'Led team offsite',
        description: '<p>Organized and led the quarterly offsite.</p>',
        achievedDate: '2025-02-15',
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ achievement: newAchievement })
  })

  it('returns 500 on database error', async () => {
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent({
      body: { title: 'Shipped v1.0', achievedDate: '2025-03-01' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
