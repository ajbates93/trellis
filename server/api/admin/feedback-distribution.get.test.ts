import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
} from '../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./feedback-distribution.get')

describe('GET /api/admin/feedback-distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zeros for all default role types when no data exists', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as Record<string, number>

    expect(result.dev).toBe(0)
    expect(result.design).toBe(0)
    expect(result.qa).toBe(0)
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it('returns counts for each role type present in the database', async () => {
    mockSelect([
      { roleType: 'dev', count: 12 },
      { roleType: 'design', count: 5 },
      { roleType: 'qa', count: 3 },
    ])

    const event = createAdminEvent()
    const result = await handler(event) as Record<string, number>

    expect(result.dev).toBe(12)
    expect(result.design).toBe(5)
    expect(result.qa).toBe(3)
  })

  it('fills in zero for role types missing from the database result', async () => {
    // Only dev has feedback; design and qa are absent
    mockSelect([{ roleType: 'dev', count: 8 }])

    const event = createAdminEvent()
    const result = await handler(event) as Record<string, number>

    expect(result.dev).toBe(8)
    expect(result.design).toBe(0)
    expect(result.qa).toBe(0)
  })

  it('includes extra role types returned by the database beyond the defaults', async () => {
    mockSelect([
      { roleType: 'dev', count: 4 },
      { roleType: 'design', count: 2 },
      { roleType: 'qa', count: 1 },
      { roleType: 'growth', count: 7 },
      { roleType: 'management', count: 3 },
    ])

    const event = createAdminEvent()
    const result = await handler(event) as Record<string, number>

    expect(result.growth).toBe(7)
    expect(result.management).toBe(3)
  })

  it('ignores rows with a null roleType', async () => {
    mockSelect([{ roleType: null, count: 99 }])

    const event = createAdminEvent()
    const result = await handler(event) as Record<string, number>

    // Null key should not appear; defaults must still be 0
    expect(result.dev).toBe(0)
    expect(result.design).toBe(0)
    expect(result.qa).toBe(0)
    expect('null' in result).toBe(false)
  })

  it('works for a non-admin authenticated user (no auth guard)', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as Record<string, number>

    expect(result.dev).toBe(0)
    expect(result.design).toBe(0)
    expect(result.qa).toBe(0)
  })

  it('throws 500 when the database errors', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB failure')
    })

    const event = createAdminEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
