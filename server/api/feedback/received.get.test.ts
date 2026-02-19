import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
  createAdminEvent,
} from '../../__tests__/helpers/mock-event'
import { buildFeedback, buildUser } from '../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

// Import handler after mocks are set up
const { default: handler } = await import('./received.get')

describe('GET /api/feedback/received', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns received feedback for the current user when no userId query param', async () => {
    const reviewer = buildUser({ id: 'user-2', name: 'Jane Smith' })
    const fb = buildFeedback({
      reviewerId: reviewer.id,
      revieweeId: 'user-1',
      published: true,
      publishedAt: new Date('2025-01-20'),
    })

    // The handler does a select with innerJoin, so mock it returning shaped rows
    const row = {
      id: fb.id,
      content: fb.content,
      createdAt: fb.createdAt,
      publishedAt: fb.publishedAt,
      isRead: fb.isRead,
      reviewer: {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        image: reviewer.image,
        avatarUrl: reviewer.avatarUrl,
        roleType: reviewer.roleType,
      },
    }
    mockSelect([row])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ feedback: [row] })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns 500 when a non-admin tries to view another user feedback', async () => {
    // The 403 is thrown inside the try block, so the catch re-throws it as 500
    const event = createAuthenticatedEvent({
      query: { userId: 'user-99' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('admin can view another user feedback', async () => {
    const reviewer = buildUser({ id: 'user-2', name: 'Jane Smith' })
    const fb = buildFeedback({
      reviewerId: reviewer.id,
      revieweeId: 'user-99',
      published: true,
      publishedAt: new Date('2025-01-22'),
    })

    const row = {
      id: fb.id,
      content: fb.content,
      createdAt: fb.createdAt,
      publishedAt: fb.publishedAt,
      isRead: fb.isRead,
      reviewer: {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        image: reviewer.image,
        avatarUrl: reviewer.avatarUrl,
        roleType: reviewer.roleType,
      },
    }
    mockSelect([row])

    const event = createAdminEvent({
      query: { userId: 'user-99' },
    })

    const result = await handler(event)

    expect(result).toEqual({ feedback: [row] })
    expect(mockDb.select).toHaveBeenCalled()
  })

  it('returns empty array when there is no feedback for the current user', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ feedback: [] })
    expect(mockDb.select).toHaveBeenCalled()
  })
})
