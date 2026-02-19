import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

// onboarding.patch.ts uses readBody() directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

// Import handler after mocks are set up
const { default: handler } = await import('./onboarding.patch')

describe('PATCH /api/users/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 400 when taskId is missing', async () => {
    mockReadBody.mockResolvedValueOnce({})

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 400 when taskId is not a valid task', async () => {
    mockReadBody.mockResolvedValueOnce({ taskId: 'not-a-real-task' })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('returns 404 when the user is not found', async () => {
    mockReadBody.mockResolvedValueOnce({ taskId: 'submit-feedback' })
    mockSelect([])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    })
  })

  it('marks a new onboarding task as completed', async () => {
    mockReadBody.mockResolvedValueOnce({ taskId: 'submit-feedback' })
    mockSelect([{ onboardingTasks: [] }])
    mockUpdate([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      onboardingTasks: ['submit-feedback'],
      alreadyCompleted: false,
    })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('returns alreadyCompleted true when task was previously completed', async () => {
    mockReadBody.mockResolvedValueOnce({ taskId: 'view-inbox' })
    mockSelect([{ onboardingTasks: ['submit-feedback', 'view-inbox'] }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      onboardingTasks: ['submit-feedback', 'view-inbox'],
      alreadyCompleted: true,
    })
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('appends a new task to an existing list of completed tasks', async () => {
    mockReadBody.mockResolvedValueOnce({ taskId: 'create-goal' })
    mockSelect([{ onboardingTasks: ['submit-feedback', 'view-inbox'] }])
    mockUpdate([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({
      onboardingTasks: ['submit-feedback', 'view-inbox', 'create-goal'],
      alreadyCompleted: false,
    })
    expect(mockDb.update).toHaveBeenCalled()
  })
})
