import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
// buildUser available if needed


const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./suggestions.get')

describe('GET /api/feedback/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns exhausted when no other users in workspace', async () => {
    // allUsers query returns empty
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ suggestion: null, exhausted: true })
  })

  it('returns suggestion for never-reviewed user', async () => {
    const otherUser = {
      id: 'user-2',
      name: 'Other User',
      email: 'other@example.com',
      image: null,
      avatarUrl: null,
      roleType: 'dev',
    }

    // 1st select: allUsers in workspace
    mockSelect([otherUser])
    // 2nd select: feedback history (empty — never reviewed anyone)
    mockSelect([])
    // 3rd select: allWorkspaceUsers for reviewStatus
    mockSelect([{ id: 'user-2' }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.suggestion).toBeDefined()
    expect(result.suggestion.user.id).toBe('user-2')
    expect(result.suggestion.reason).toContain('never given feedback')
    expect(result.exhausted).toBe(false)
  })

  it('returns suggestion for least recently reviewed user', async () => {
    const user2 = {
      id: 'user-2',
      name: 'User Two',
      email: 'two@example.com',
      image: null,
      avatarUrl: null,
      roleType: 'dev',
    }
    const user3 = {
      id: 'user-3',
      name: 'User Three',
      email: 'three@example.com',
      image: null,
      avatarUrl: null,
      roleType: 'dev',
    }

    // 1st select: allUsers
    mockSelect([user2, user3])
    // 2nd select: feedback history — both reviewed, user-2 longer ago
    mockSelect([
      {
        revieweeId: 'user-2',
        lastReviewedAt: '2024-01-01T00:00:00.000Z',
        reviewCount: 2,
        lastWeekYear: '2024-W01',
      },
      {
        revieweeId: 'user-3',
        lastReviewedAt: '2025-01-10T00:00:00.000Z',
        reviewCount: 1,
        lastWeekYear: '2025-W02',
      },
    ])
    // 3rd select: allWorkspaceUsers
    mockSelect([{ id: 'user-2' }, { id: 'user-3' }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.suggestion).toBeDefined()
    expect(result.suggestion.user.id).toBe('user-2')
    expect(result.suggestion.reason).toContain('weeks since')
    expect(result.exhausted).toBe(false)
    expect(result.reviewStatus).toBeDefined()
  })
})
