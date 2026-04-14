import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

// Mock readBody globally since this endpoint uses it directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./index.post')

describe('POST /api/goals/:id/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent({
      params: { id: 'goal-1' },
      body: { noteText: 'A new note' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when goalId param is missing', async () => {
    const event = createAuthenticatedEvent({
      params: {},
      body: { noteText: 'A new note' },
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
      body: { noteText: 'A new note' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Goal not found',
    })
  })

  it('returns 403 when user is not the owner or buddy', async () => {
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
      body: { noteText: 'A new note' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
      message: "You don't have permission to add notes to this goal",
    })
  })

  it('creates a note successfully when user is the goal owner', async () => {
    mockReadBody.mockResolvedValueOnce({ noteText: 'A new note' })

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

    const insertedNote = {
      id: 'note-1',
      goalId: 'goal-1',
      authorId: 'user-1',
      noteText: 'A new note',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
    }

    // Insert: the new note record
    mockInsert([insertedNote])

    const noteWithAuthor = {
      id: 'note-1',
      noteText: 'A new note',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
      author: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        avatarUrl: null,
      },
    }

    // Second select: fetch note with author details
    mockSelect([noteWithAuthor])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { noteText: 'A new note' },
    })

    const result = await handler(event)

    expect(result).toEqual({ note: noteWithAuthor })
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })

  it('creates a note successfully when user is the buddy of the goal owner', async () => {
    mockReadBody.mockResolvedValueOnce({ noteText: 'Buddy note' })

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

    const insertedNote = {
      id: 'note-2',
      goalId: 'goal-1',
      authorId: 'user-1',
      noteText: 'Buddy note',
      createdAt: new Date('2025-01-12'),
      updatedAt: new Date('2025-01-12'),
    }

    // Insert: the new note record
    mockInsert([insertedNote])

    const noteWithAuthor = {
      id: 'note-2',
      noteText: 'Buddy note',
      createdAt: new Date('2025-01-12'),
      updatedAt: new Date('2025-01-12'),
      author: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        avatarUrl: null,
      },
    }

    // Second select: fetch note with author details
    mockSelect([noteWithAuthor])

    const event = createAuthenticatedEvent({
      params: { id: 'goal-1' },
      body: { noteText: 'Buddy note' },
    })

    const result = await handler(event)

    expect(result).toEqual({ note: noteWithAuthor })
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })
})
