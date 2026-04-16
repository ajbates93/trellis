import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { buildWorkspace } from '#server/__tests__/helpers/factories'

const { mockDb, mockSelect, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

// Mock readBody at module level before handler import (endpoint uses readBody directly)
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

const { default: handler } = await import('./[id].patch')

describe('PATCH /api/super-admin/workspaces/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when id param is missing', async () => {
    // readBody is NOT called because handler throws before reaching it
    const event = createMockEvent({ method: 'PATCH', params: {} })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Workspace ID is required',
    })
  })

  it('throws when body is invalid - logoUrl not a URL', async () => {
    mockReadBody.mockResolvedValueOnce({ logoUrl: 'not-a-valid-url' })

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toThrow()
  })

  it('throws when name is empty string', async () => {
    mockReadBody.mockResolvedValueOnce({ name: '' })

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })

    await expect(handler(event)).rejects.toThrow()
  })

  it('returns 404 when workspace does not exist', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'Updated Name' })
    mockSelect([])

    const event = createMockEvent({ method: 'PATCH', params: { id: 'nonexistent-id' } })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Workspace not found',
    })
  })

  it('updates workspace name successfully', async () => {
    const updatedWorkspace = buildWorkspace({ id: 'ws-1', name: 'New Name' })

    mockReadBody.mockResolvedValueOnce({ name: 'New Name' })
    mockSelect([buildWorkspace({ id: 'ws-1', name: 'Old Name' })])
    mockUpdate([updatedWorkspace])

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result).toEqual({
      success: true,
      workspace: updatedWorkspace,
    })
  })

  it('updates workspace logoUrl successfully', async () => {
    const updatedWorkspace = buildWorkspace({
      id: 'ws-1',
      logoUrl: 'https://example.com/new-logo.png',
    })

    mockReadBody.mockResolvedValueOnce({
      logoUrl: 'https://example.com/new-logo.png',
    })
    mockSelect([buildWorkspace({ id: 'ws-1', logoUrl: null })])
    mockUpdate([updatedWorkspace])

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.workspace.logoUrl).toBe('https://example.com/new-logo.png')
  })

  it('allows setting logoUrl to null', async () => {
    const updatedWorkspace = buildWorkspace({ id: 'ws-1', logoUrl: null })

    mockReadBody.mockResolvedValueOnce({ logoUrl: null })
    mockSelect([buildWorkspace({ id: 'ws-1', logoUrl: 'https://example.com/logo.png' })])
    mockUpdate([updatedWorkspace])

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.workspace.logoUrl).toBeNull()
  })

  it('updates both name and logoUrl at once', async () => {
    const updatedWorkspace = buildWorkspace({
      id: 'ws-1',
      name: 'New Name',
      logoUrl: 'https://example.com/logo.png',
    })

    mockReadBody.mockResolvedValueOnce({
      name: 'New Name',
      logoUrl: 'https://example.com/logo.png',
    })
    mockSelect([buildWorkspace({ id: 'ws-1', name: 'Old', logoUrl: null })])
    mockUpdate([updatedWorkspace])

    const event = createMockEvent({ method: 'PATCH', params: { id: 'ws-1' } })
    const result = await handler(event)

    expect(result.success).toBe(true)
    expect(result.workspace.name).toBe('New Name')
    expect(result.workspace.logoUrl).toBe('https://example.com/logo.png')
  })
})
