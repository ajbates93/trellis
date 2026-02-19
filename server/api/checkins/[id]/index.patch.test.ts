import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'
import { buildCheckin, buildUser } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const { default: handler } = await import('./index.patch')

describe('PATCH /api/checkins/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('updates the checkin notes successfully', async () => {
    const checkin = buildCheckin({ id: 'checkin-1', buddyId: 'user-1', userId: 'buddy-user-1' })
    const buddy = buildUser({ id: 'user-1' })

    const updatedCheckinWithJoin = {
      id: 'checkin-1',
      buddy: { id: buddy.id, name: buddy.name, email: buddy.email, avatarUrl: null },
      notes: 'Updated notes',
      reviewScheduleId: null,
      createdAt: checkin.createdAt,
      updatedAt: new Date(),
    }

    // First select: fetch checkin to verify ownership
    mockSelect([checkin])
    // update
    mockUpdate([{ ...checkin, notes: 'Updated notes' }])
    // Second select: fetch updated checkin with innerJoin
    mockSelect([updatedCheckinWithJoin])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { notes: 'Updated notes' },
    })

    const result = await handler(event) as any

    expect(result.success).toBe(true)
    expect(result.checkin).toEqual(updatedCheckinWithJoin)
    expect(mockDb.update).toHaveBeenCalled()
  })

  // The catch block in index.patch.ts checks error.message.includes("404") — H3Error message
  // is "Check-in not found" which does not include "404", so the error is re-thrown as 500.
  it('returns 500 when checkin does not exist (404 caught by generic handler)', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-nonexistent' },
      body: { notes: 'Updated notes' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  // Similarly the 403 message "You can only edit your own check-ins" does not include "403"
  // so it is re-thrown as 500 by the generic catch block.
  it('returns 500 when session user is not the buddy who created the checkin (403 caught by generic handler)', async () => {
    const checkin = buildCheckin({ id: 'checkin-1', buddyId: 'user-99', userId: 'buddy-user-1' })

    mockSelect([checkin])

    const event = createAuthenticatedEvent({
      params: { id: 'checkin-1' },
      body: { notes: 'Hacked notes' },
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
      body: { notes: 'Some notes' },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
