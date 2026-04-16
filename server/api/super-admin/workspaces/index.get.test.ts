import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { buildWorkspace } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./index.get')

describe('GET /api/super-admin/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all workspaces with user counts', async () => {
    const ws1 = buildWorkspace({ id: 'ws-1', name: 'Alpha Corp' })
    const ws2 = buildWorkspace({ id: 'ws-2', name: 'Beta Inc' })

    // First select: fetch all workspaces
    mockSelect([ws1, ws2])
    // Second select: user count for ws1
    mockSelect([{ count: 10 }])
    // Third select: user count for ws2
    mockSelect([{ count: 5 }])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({
      workspaces: [
        { ...ws1, userCount: 10 },
        { ...ws2, userCount: 5 },
      ],
    })
    // 1 for listing + 1 per workspace
    expect(mockDb.select).toHaveBeenCalledTimes(3)
  })

  it('returns empty array when no workspaces exist', async () => {
    mockSelect([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({ workspaces: [] })
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns userCount of 0 when workspace has no users', async () => {
    const ws = buildWorkspace({ id: 'ws-empty', name: 'Empty Workspace' })

    mockSelect([ws])
    mockSelect([{ count: 0 }])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.workspaces[0].userCount).toBe(0)
  })

  it('handles missing count row gracefully', async () => {
    const ws = buildWorkspace({ id: 'ws-1', name: 'Workspace One' })

    mockSelect([ws])
    // No count row returned
    mockSelect([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.workspaces[0].userCount).toBe(0)
  })

  it('throws when database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createMockEvent()

    await expect(handler(event)).rejects.toThrow('DB connection lost')
  })
})
