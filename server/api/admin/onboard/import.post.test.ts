import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '../../../__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))
vi.mock('../../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))
vi.mock('../../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))
vi.mock('../../../schemas', () => ({
  apiSchemas: {
    OnboardingImportRequestSchema: {},
    OnboardingImportResponseSchema: {},
  },
}))

const { default: handler } = await import('./import.post')
const { auth } = await import('../../../utils/auth')

describe('POST /api/admin/onboard/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any)

    const event = createUnauthenticatedEvent()

    // The outer try/catch in import.post.ts re-wraps all errors including 401 as 500
    // with the original error message preserved
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Unauthorized',
    })
  })

  it('returns error when CSV has only a header row', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    const event = createAdminEvent({
      body: {
        csv: 'email,name,roleType,buddyEmail',
        filename: 'test.csv',
      },
    })

    // The outer catch in import.post.ts re-throws internal errors as 500 with the original message
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'CSV must have at least a header row and one data row',
    })
  })

  it('returns error when CSV is missing required email field', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    const event = createAdminEvent({
      body: {
        csv: 'name,roleType\nJohn Doe,dev',
        filename: 'test.csv',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'CSV missing required field: email',
    })
  })

  it('returns error when CSV is missing required name field', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    const event = createAdminEvent({
      body: {
        csv: 'email,roleType\njohn@example.com,dev',
        filename: 'test.csv',
      },
    })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'CSV missing required field: name',
    })
  })

  it('returns validation errors and logs failed import when email is invalid', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // mockInsert for logging the failed import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name\nnot-an-email,John Doe',
        filename: 'bad.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      rowsImported: 0,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ]),
    })
  })

  it('returns validation errors when name is empty', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name\njohn@example.com,',
        filename: 'bad.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      rowsImported: 0,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
      ]),
    })
  })

  it('returns validation errors when roleType is invalid', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name,roleType\njohn@example.com,John Doe,marketing',
        filename: 'bad.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      rowsImported: 0,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'roleType' }),
      ]),
    })
  })

  it('returns error when user already exists in database', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // Existing user found
    mockSelect([{ id: 'existing-user', email: 'john@example.com' }])
    // Log failed import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name\njohn@example.com,John Doe',
        filename: 'test.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      rowsImported: 0,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('already exists'),
        }),
      ]),
    })
  })

  it('imports a single valid user successfully', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // No existing user
    mockSelect([])
    // Insert new user
    mockInsert([{ id: 'new-user-1', email: 'jane@example.com', name: 'Jane Smith' }])
    // Log successful import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name,roleType\njane@example.com,Jane Smith,design',
        filename: 'import.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: true,
      rowsImported: 1,
      errors: [],
    })
  })

  it('imports multiple valid users successfully', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // Two existence checks — neither user exists
    mockSelect([])
    mockSelect([])
    // Insert first user
    mockInsert([{ id: 'new-user-1', email: 'alice@example.com', name: 'Alice Brown' }])
    // Insert second user
    mockInsert([{ id: 'new-user-2', email: 'bob@example.com', name: 'Bob Jones' }])
    // Log successful import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name\nalice@example.com,Alice Brown\nbob@example.com,Bob Jones',
        filename: 'import.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: true,
      rowsImported: 2,
    })
  })

  it('assigns buddy relationship when buddyEmail is provided and buddy exists', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // Existence check for jane — not found
    mockSelect([])
    // Insert jane
    mockInsert([{ id: 'user-jane', email: 'jane@example.com', name: 'Jane Smith' }])
    // Buddy lookup — bob found
    mockSelect([{ id: 'user-bob', email: 'bob@example.com' }])
    // Update jane's buddyId
    mockUpdate([])
    // Log successful import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name,buddyEmail\njane@example.com,Jane Smith,bob@example.com',
        filename: 'import.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: true,
      rowsImported: 1,
    })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('records a buddyEmail error when buddy is not found', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // Existence check — user not found
    mockSelect([])
    // Insert user
    mockInsert([{ id: 'user-jane', email: 'jane@example.com', name: 'Jane Smith' }])
    // Buddy lookup — not found
    mockSelect([])
    // Log successful import (with partial errors)
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name,buddyEmail\njane@example.com,Jane Smith,nobody@example.com',
        filename: 'import.csv',
      },
    })

    const result = await handler(event)

    // User was still imported; buddy error is recorded in errors array
    expect(result).toMatchObject({
      success: true,
      rowsImported: 1,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'buddyEmail' }),
      ]),
    })
  })

  it('returns validation errors for duplicate emails within the CSV', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User', role: 'admin' },
    } as any)

    // Two existence checks — neither user exists
    mockSelect([])
    mockSelect([])
    // Log failed import
    mockInsert([])

    const event = createAdminEvent({
      body: {
        csv: 'email,name\njohn@example.com,John Doe\njohn@example.com,John Duplicate',
        filename: 'import.csv',
      },
    })

    const result = await handler(event)

    expect(result).toMatchObject({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('Duplicate'),
        }),
      ]),
    })
  })
})
