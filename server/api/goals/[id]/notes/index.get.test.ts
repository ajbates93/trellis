import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.get')

describe('GET /api/goals/:id/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'goal-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when goalId param is missing', async () => {
    const event = createAuthenticatedEvent({
      params: {},
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Goal ID is required',
    })
  })

  it('returns 404 when goal is not found', async () => {
    // First select: goal permission check returns empty
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-999' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Goal not found',
    })
  })

  it('returns 403 when user is not owner or buddy', async () => {
    // First select: goal exists but belongs to a different user whose buddy is also different
    mockSelect([
      {
        id: 'goal-1',
        userId: 'other-user',
        owner: {
          id: 'other-user',
          buddyId: 'another-buddy',
        },
      },
    ])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: "You don't have permission to view these notes",
    })
  })

  it('returns notes when user is the goal owner', async () => {
    // First select: permission check — current user (user-1) is the owner
    mockSelect([
      {
        id: 'goal-1',
        userId: 'user-1',
        owner: {
          id: 'user-1',
          buddyId: 'buddy-1',
        },
      },
    ])

    const note = {
      id: 'note-1',
      goalId: 'goal-1',
      authorId: 'user-1',
      noteText: 'Great progress!',
      createdAt: new Date('2025-01-10'),
      author: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        avatarUrl: null,
      },
    }

    // Second select: notes with author details
    mockSelect([note])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ notes: [note] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns notes when user is the buddy of the goal owner', async () => {
    // First select: permission check — current user (user-1) is the buddy of the owner
    mockSelect([
      {
        id: 'goal-1',
        userId: 'other-user',
        owner: {
          id: 'other-user',
          buddyId: 'user-1',
        },
      },
    ])

    const note = {
      id: 'note-2',
      goalId: 'goal-1',
      authorId: 'user-1',
      noteText: 'Keep it up!',
      createdAt: new Date('2025-01-11'),
      author: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        avatarUrl: null,
      },
    }

    // Second select: notes with author details
    mockSelect([note])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ notes: [note] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('returns empty notes array when goal has no notes', async () => {
    // First select: permission check — current user is the owner
    mockSelect([
      {
        id: 'goal-1',
        userId: 'user-1',
        owner: {
          id: 'user-1',
          buddyId: 'buddy-1',
        },
      },
    ])

    // Second select: no notes
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ notes: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })
})
