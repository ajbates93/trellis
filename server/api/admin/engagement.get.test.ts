import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

const { default: handler } = await import('./engagement.get')

describe('GET /api/admin/engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a timeline with 12 entries for the last 12 weeks', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { success: boolean; timeline: { week: string; count: number }[] }

    expect(result.success).toBe(true)
    expect(result.timeline).toHaveLength(12)
  })

  it('fills in zero counts for weeks without data', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { success: boolean; timeline: { week: string; count: number }[] }

    for (const entry of result.timeline) {
      expect(entry.count).toBe(0)
    }
  })

  it('maps database rows into matching weeks with their counts', async () => {
    // Build a week string that matches the current ISO week so it lands in the
    // 12-week window regardless of when the test runs.
    const now = new Date()
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const thisWeek = `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`

    mockSelect([{ weekYear: thisWeek, count: 5 }])

    const event = createAdminEvent()
    const result = await handler(event) as { success: boolean; timeline: { week: string; count: number }[] }

    const matchingEntry = result.timeline.find((e) => e.week === thisWeek)
    expect(matchingEntry).toBeDefined()
    expect(matchingEntry?.count).toBe(5)
  })

  it('returns week strings in ascending order', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event) as { success: boolean; timeline: { week: string; count: number }[] }

    const weeks = result.timeline.map((e) => e.week)
    const sorted = [...weeks].sort()
    expect(weeks).toEqual(sorted)
  })

  it('works for a non-admin authenticated user (no auth guard)', async () => {
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event) as { success: boolean; timeline: unknown[] }

    expect(result.success).toBe(true)
    expect(result.timeline).toHaveLength(12)
  })

  it('ignores rows with a null weekYear', async () => {
    mockSelect([{ weekYear: null, count: 99 }])

    const event = createAdminEvent()
    const result = await handler(event) as { success: boolean; timeline: { week: string; count: number }[] }

    for (const entry of result.timeline) {
      expect(entry.count).toBe(0)
    }
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
