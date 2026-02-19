import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../schemas', () => ({
  apiSchemas: {
    GetOnboardingHistoryResponseSchema: {},
  },
}))

const { default: handler } = await import('./history.get')

describe('GET /api/admin/onboard/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns import history with empty list', async () => {
    mockSelect([])

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({ imports: [] })
  })

  it('returns import history with records', async () => {
    const mockImports = [
      {
        id: 'import-1',
        filename: 'team.csv',
        rowsImported: 5,
        status: 'completed',
        errorLog: null,
        createdAt: new Date('2025-01-15'),
        adminName: 'Admin User',
        adminEmail: 'admin@example.com',
      },
      {
        id: 'import-2',
        filename: 'contractors.csv',
        rowsImported: 0,
        status: 'failed',
        errorLog: JSON.stringify([{ row: 2, field: 'email', message: 'Invalid email' }]),
        createdAt: new Date('2025-01-10'),
        adminName: 'Admin User',
        adminEmail: 'admin@example.com',
      },
    ]

    mockSelect(mockImports)

    const event = createAdminEvent()
    const result = await handler(event)

    expect(result).toEqual({ imports: mockImports })
  })

  it('returns 500 on database error', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to fetch import history',
    })
  })
})
