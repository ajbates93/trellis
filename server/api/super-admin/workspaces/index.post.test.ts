import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '../../../__tests__/helpers/mock-db'
import { createMockEvent } from '../../../__tests__/helpers/mock-event'
import { buildWorkspace, buildUser } from '../../../__tests__/helpers/factories'

const { mockDb, mockInsert } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

// Mock readBody at module level before handler import (endpoint uses readBody directly)
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('test-uuid') })

const { default: handler } = await import('./index.post')

describe('POST /api/super-admin/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when body is missing required name field (zod validation fails)', async () => {
    // Zod v4 uses .issues instead of .errors, so parsed.error.errors.map throws TypeError
    mockReadBody.mockResolvedValueOnce({})

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toThrow()
  })

  it('throws when name is empty string (zod validation fails)', async () => {
    mockReadBody.mockResolvedValueOnce({ name: '' })

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toThrow()
  })

  it('throws when logoUrl is not a valid URL (zod validation fails)', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'Test Workspace', logoUrl: 'not-a-url' })

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toThrow()
  })

  it('creates a workspace without admin user', async () => {
    const newWorkspace = buildWorkspace({ id: 'test-uuid', name: 'New Workspace', logoUrl: null })

    mockReadBody.mockResolvedValueOnce({ name: 'New Workspace' })
    mockInsert([newWorkspace])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      workspace: newWorkspace,
      adminUser: null,
    })
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })

  it('creates a workspace with logoUrl', async () => {
    const newWorkspace = buildWorkspace({
      id: 'test-uuid',
      name: 'Logo Workspace',
      logoUrl: 'https://example.com/logo.png',
    })

    mockReadBody.mockResolvedValueOnce({
      name: 'Logo Workspace',
      logoUrl: 'https://example.com/logo.png',
    })
    mockInsert([newWorkspace])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.workspace.logoUrl).toBe('https://example.com/logo.png')
    expect(result.adminUser).toBeNull()
  })

  it('creates a workspace with an admin user', async () => {
    const newWorkspace = buildWorkspace({ id: 'test-uuid', name: 'Managed Workspace' })
    const adminUser = buildUser({
      id: 'admin-uuid',
      email: 'admin@company.com',
      name: 'Admin Person',
      role: 'admin',
      workspaceId: 'test-uuid',
      emailVerified: false,
    })

    mockReadBody.mockResolvedValueOnce({
      name: 'Managed Workspace',
      adminEmail: 'admin@company.com',
      adminName: 'Admin Person',
    })
    // First insert: workspace
    mockInsert([newWorkspace])
    // Second insert: admin user
    mockInsert([adminUser])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.workspace).toEqual(newWorkspace)
    expect(result.adminUser).toEqual({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
    })
    expect(mockDb.insert).toHaveBeenCalledTimes(2)
  })

  it('creates admin user using email as name when adminName is not provided', async () => {
    const newWorkspace = buildWorkspace({ id: 'test-uuid', name: 'No Name Workspace' })
    const adminUser = buildUser({
      id: 'admin-uuid',
      email: 'noreply@example.com',
      name: 'noreply@example.com',
      role: 'admin',
    })

    mockReadBody.mockResolvedValueOnce({
      name: 'No Name Workspace',
      adminEmail: 'noreply@example.com',
    })
    mockInsert([newWorkspace])
    mockInsert([adminUser])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result.adminUser).not.toBeNull()
    expect(result.adminUser!.email).toBe('noreply@example.com')
  })

  it('throws when adminEmail is invalid (zod validation fails)', async () => {
    mockReadBody.mockResolvedValueOnce({
      name: 'Valid Workspace',
      adminEmail: 'not-an-email',
    })

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toThrow()
  })

  it('throws when database errors during workspace insert', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'New Workspace' })
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB insert failed')
    })

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toThrow('DB insert failed')
  })
})
