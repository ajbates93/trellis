import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))

const { default: handler } = await import('./stats.get')

describe('GET /api/super-admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns platform stats with all counts', async () => {
    // 1. workspaceCount
    mockSelect([{ count: 5 }])
    // 2. totalUsers
    mockSelect([{ count: 42 }])
    // 3. activeUsers (emailVerified = true)
    mockSelect([{ count: 30 }])
    // 4. totalFeedback
    mockSelect([{ count: 100 }])
    // 5. topWorkspaces
    mockSelect([
      { id: 'ws-1', name: 'Workspace A', userCount: 15 },
      { id: 'ws-2', name: 'Workspace B', userCount: 12 },
    ])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({
      stats: {
        workspaceCount: 5,
        totalUsers: 42,
        activeUsers: 30,
        invitedUsers: 12,
        totalFeedback: 100,
      },
      topWorkspaces: [
        { id: 'ws-1', name: 'Workspace A', userCount: 15 },
        { id: 'ws-2', name: 'Workspace B', userCount: 12 },
      ],
    })
    expect(mockDb.select).toHaveBeenCalledTimes(5)
  })

  it('computes invitedUsers as totalUsers minus activeUsers', async () => {
    mockSelect([{ count: 10 }])
    mockSelect([{ count: 80 }])
    mockSelect([{ count: 60 }])
    mockSelect([{ count: 200 }])
    mockSelect([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.stats.invitedUsers).toBe(20)
    expect(result.stats.totalUsers).toBe(80)
    expect(result.stats.activeUsers).toBe(60)
  })

  it('returns zeros when all counts are empty', async () => {
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])
    mockSelect([])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({
      stats: {
        workspaceCount: 0,
        totalUsers: 0,
        activeUsers: 0,
        invitedUsers: 0,
        totalFeedback: 0,
      },
      topWorkspaces: [],
    })
  })

  it('returns topWorkspaces ordered by user count', async () => {
    mockSelect([{ count: 3 }])
    mockSelect([{ count: 50 }])
    mockSelect([{ count: 40 }])
    mockSelect([{ count: 500 }])
    mockSelect([
      { id: 'ws-1', name: 'Big Corp', userCount: 25 },
      { id: 'ws-2', name: 'Medium Co', userCount: 10 },
      { id: 'ws-3', name: 'Small Biz', userCount: 5 },
    ])

    const event = createMockEvent()
    const result = await handler(event)

    expect(result.topWorkspaces).toHaveLength(3)
    expect(result.topWorkspaces[0].name).toBe('Big Corp')
    expect(result.topWorkspaces[0].userCount).toBe(25)
  })

  it('throws when database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createMockEvent()

    await expect(handler(event)).rejects.toThrow('DB connection lost')
  })
})
