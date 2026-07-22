import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb } = createMockDb()

const mockAssertNotSoleAdmin = vi.fn().mockResolvedValue(undefined)
const mockAnonymizeUser = vi.fn().mockResolvedValue(undefined)

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))
vi.mock('../../utils/accountDeletion', () => ({
  assertNotSoleAdmin: mockAssertNotSoleAdmin,
  anonymizeUser: mockAnonymizeUser,
}))

const { default: handler } = await import('./delete-account.post')

describe('POST /api/user/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when the caller is the sole admin', async () => {
    mockAssertNotSoleAdmin.mockRejectedValueOnce({
      statusCode: 400,
      message: 'You are the only admin in this workspace. Assign another admin before deleting this account.',
    })

    const event = createAuthenticatedEvent({ session: { user: { id: 'user-1' } as any } })

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mockAnonymizeUser).not.toHaveBeenCalled()
  })

  it('deletes (anonymizes) the caller own account and returns success', async () => {
    const event = createAuthenticatedEvent({ session: { user: { id: 'user-1' } as any } })

    const result = await handler(event)

    expect(result).toEqual({ success: true })
    expect(mockAssertNotSoleAdmin).toHaveBeenCalledWith('user-1', 'workspace-1')
    expect(mockAnonymizeUser).toHaveBeenCalledWith('user-1')
    const assertOrder = mockAssertNotSoleAdmin.mock.invocationCallOrder[0]
    const anonymizeOrder = mockAnonymizeUser.mock.invocationCallOrder[0]
    expect(assertOrder).toBeLessThan(anonymizeOrder as number)
  })
})
