import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import { createMockEvent } from '../../../__tests__/helpers/mock-event'
import { buildWorkspace } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect, mockDelete } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./[id].delete')

describe('DELETE /api/super-admin/workspaces/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when id param is missing', async () => {
    const event = createMockEvent({ method: 'DELETE', params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Workspace ID is required',
    })
  })

  it('returns 404 when workspace does not exist', async () => {
    // Existence check returns empty
    mockSelect([])

    const event = createMockEvent({ method: 'DELETE', params: { id: 'nonexistent-id' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Workspace not found',
    })
  })

  it('returns 400 when workspace has users', async () => {
    const workspace = buildWorkspace({ id: 'ws-1', name: 'Populated Workspace' })

    // 1. Existence check
    mockSelect([workspace])
    // 2. User count check returns users
    mockSelect([{ count: 3 }])

    const event = createMockEvent({ method: 'DELETE', params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot delete workspace with 3 users. Remove all users first.',
    })
  })

  it('returns 400 when workspace has a single user', async () => {
    const workspace = buildWorkspace({ id: 'ws-1' })

    mockSelect([workspace])
    mockSelect([{ count: 1 }])

    const event = createMockEvent({ method: 'DELETE', params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('deletes workspace successfully when it has no users', async () => {
    const workspace = buildWorkspace({ id: 'ws-1', name: 'Empty Workspace' })

    // 1. Existence check
    mockSelect([workspace])
    // 2. User count check returns zero
    mockSelect([{ count: 0 }])
    // 3. Delete operation
    mockDelete([])

    const event = createMockEvent({ method: 'DELETE', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      message: 'Workspace deleted successfully',
    })
    expect(mockDb.select).toHaveBeenCalledTimes(2)
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })

  it('deletes workspace when user count row is missing', async () => {
    const workspace = buildWorkspace({ id: 'ws-1' })

    mockSelect([workspace])
    // Count row is absent
    mockSelect([])
    mockDelete([])

    const event = createMockEvent({ method: 'DELETE', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })

  it('throws when database errors during existence check', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB error')
    })

    const event = createMockEvent({ method: 'DELETE', params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toThrow('DB error')
  })
})
