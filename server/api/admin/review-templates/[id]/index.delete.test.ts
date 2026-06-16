import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const selectLimit = vi.fn()
const updateWhere = vi.fn()
const updateSet = vi.fn(() => ({ where: updateWhere }))

vi.mock('#server/database/connection', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: selectLimit }),
      }),
    }),
    update: () => ({ set: updateSet }),
  },
}))

const { default: handler } = await import('./index.delete')

describe('DELETE /api/admin/review-templates/[id]', () => {
  beforeEach(() => {
    selectLimit.mockReset()
    updateSet.mockClear()
    updateWhere.mockReset()
    updateWhere.mockResolvedValue(undefined)
  })

  it('archives a non-default template', async () => {
    selectLimit.mockResolvedValue([{ isDefault: false }])

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/admin/review-templates/tpl-1',
      params: { id: 'tpl-1' },
    })
    event.context.session = { user: { id: 'admin-1', role: 'admin' } }
    event.context.user = { workspaceId: 'ws-1' }

    const res = await handler(event)

    expect(res).toEqual({ success: true })
    expect(updateSet).toHaveBeenCalledTimes(1)
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ archivedAt: expect.any(Date) }),
    )
  })

  it('refuses to archive the default template with 400', async () => {
    selectLimit.mockResolvedValue([{ isDefault: true }])

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/admin/review-templates/tpl-default',
      params: { id: 'tpl-default' },
    })
    event.context.session = { user: { id: 'admin-1', role: 'admin' } }
    event.context.user = { workspaceId: 'ws-1' }

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing template', async () => {
    selectLimit.mockResolvedValue([])

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/admin/review-templates/missing',
      params: { id: 'missing' },
    })
    event.context.session = { user: { id: 'admin-1', role: 'admin' } }
    event.context.user = { workspaceId: 'ws-1' }

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(updateSet).not.toHaveBeenCalled()
  })
})
