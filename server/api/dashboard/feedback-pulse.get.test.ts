import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateResponse: vi.fn().mockImplementation((data: unknown) => data),
}))

const { default: handler } = await import('./feedback-pulse.get')

describe('GET /api/dashboard/feedback-pulse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns a 12-week series zero-filled when there is no data', async () => {
    // 1. givenByWeek → empty
    mockSelect([])
    // 2. receivedByWeek → empty
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result.weeks).toHaveLength(12)
    for (const w of result.weeks) {
      expect(w.given).toBe(0)
      expect(w.received).toBe(0)
      expect(w.week).toMatch(/^\d{4}-W\d{2}$/)
    }
  })

  it('returns weeks in chronological order (oldest first)', async () => {
    mockSelect([])
    mockSelect([])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    // Each entry is an ISO week string — verify they sort ascending.
    const sorted = [...result.weeks].map((w: { week: string }) => w.week).sort()
    expect(result.weeks.map((w: { week: string }) => w.week)).toEqual(sorted)
  })

  it('maps grouped db counts into the correct week buckets', async () => {
    // Pick the week label the endpoint will generate for "now" so we know
    // at least one bucket we can assert against.
    function isoWeekOf(date: Date): string {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      )
      return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    }
    const currentWeek = isoWeekOf(new Date())

    // givenByWeek rows
    mockSelect([
      { weekYear: currentWeek, count: 4 },
      { weekYear: 'not-a-real-week', count: 99 }, // should be ignored
    ])
    // receivedByWeek rows
    mockSelect([{ weekYear: currentWeek, count: 2 }])

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    const currentBucket = result.weeks.find(
      (w: { week: string }) => w.week === currentWeek,
    )
    expect(currentBucket).toBeDefined()
    expect(currentBucket!.given).toBe(4)
    expect(currentBucket!.received).toBe(2)

    // The bogus row should not appear in the 12-week series
    expect(
      result.weeks.find((w: { week: string }) => w.week === 'not-a-real-week'),
    ).toBeUndefined()
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch feedback pulse',
    })
  })
})
