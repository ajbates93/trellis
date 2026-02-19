import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildAchievement } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.delete')

describe('DELETE /api/achievements/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 404 when achievement does not exist', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'achievement-nonexistent' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('deletes the achievement successfully', async () => {
    const existing = buildAchievement({ id: 'achievement-1', userId: 'user-1' })

    mockSelect([existing])
    mockDelete([])

    const event = createAuthenticatedEvent({
      params: { id: 'achievement-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('returns 403 when achievement belongs to another user', async () => {
    const existing = buildAchievement({ id: 'achievement-1', userId: 'user-99' })

    mockSelect([existing])

    const event = createAuthenticatedEvent({
      params: { id: 'achievement-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent({
      params: { id: 'achievement-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
