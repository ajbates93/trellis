import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import { createMockEvent } from '../../../__tests__/helpers/mock-event'
import { buildWorkspace } from '../../../__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./[id].get')

describe('GET /api/super-admin/workspaces/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when id param is missing', async () => {
    const event = createMockEvent({ params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Workspace ID is required',
    })
  })

  it('returns 404 when workspace does not exist', async () => {
    // Workspace select returns empty
    mockSelect([])

    const event = createMockEvent({ params: { id: 'nonexistent-id' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Workspace not found',
    })
  })

  it('returns workspace with user count and admin count', async () => {
    const workspace = buildWorkspace({ id: 'ws-1', name: 'Test Workspace' })

    // 1. Workspace select
    mockSelect([workspace])
    // 2. Total user count
    mockSelect([{ count: 8 }])
    // 3. Admin count
    mockSelect([{ count: 2 }])

    const event = createMockEvent({ params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result).toEqual({
      workspace: {
        ...workspace,
        userCount: 8,
        adminCount: 2,
      },
    })
    expect(mockDb.select).toHaveBeenCalledTimes(3)
  })

  it('returns userCount of 0 when workspace has no users', async () => {
    const workspace = buildWorkspace({ id: 'ws-empty', name: 'Empty Workspace' })

    mockSelect([workspace])
    mockSelect([{ count: 0 }])
    mockSelect([{ count: 0 }])

    const event = createMockEvent({ params: { id: 'ws-empty' } })
    const result = await handler(event)

    expect(result.workspace.userCount).toBe(0)
    expect(result.workspace.adminCount).toBe(0)
  })

  it('handles missing count rows gracefully', async () => {
    const workspace = buildWorkspace({ id: 'ws-1' })

    mockSelect([workspace])
    mockSelect([])
    mockSelect([])

    const event = createMockEvent({ params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.workspace.userCount).toBe(0)
    expect(result.workspace.adminCount).toBe(0)
  })

  it('throws when database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB error')
    })

    const event = createMockEvent({ params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toThrow('DB error')
  })
})
