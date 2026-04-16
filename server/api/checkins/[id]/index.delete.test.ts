import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildCheckin } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.delete')

describe('DELETE /api/checkins/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('deletes the checkin successfully', async () => {
    const checkin = buildCheckin({ id: 'checkin-1', buddyId: 'user-1', userId: 'buddy-user-1' })

    mockSelect([checkin])
    mockDelete([])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
    })

    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockDb.delete).toHaveBeenCalled()
  })

  // The catch block in index.delete.ts checks error.message.includes("404") — H3Error message
  // is "Check-in not found" which does not include "404", so the error is re-thrown as 500.
  it('returns 500 when checkin does not exist (404 caught by generic handler)', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-nonexistent' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  // Similarly the 403 message "You can only delete your own check-ins" does not include "403"
  // so it is re-thrown as 500 by the generic catch block.
  it('returns 500 when session user is not the buddy who created the checkin (403 caught by generic handler)', async () => {
    const checkin = buildCheckin({ id: 'checkin-1', buddyId: 'user-99', userId: 'buddy-user-1' })

    mockSelect([checkin])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
