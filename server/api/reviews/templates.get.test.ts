import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const orderBy = vi.fn()
const where = vi.fn(() => ({ orderBy }))
const from = vi.fn(() => ({ where }))
const select = vi.fn(() => ({ from }))

vi.mock('#server/database/connection', () => ({
  db: { select: () => select() },
}))

const { default: handler } = await import('./templates.get')

describe('GET /api/reviews/templates', () => {
  beforeEach(() => {
    orderBy.mockReset()
    select.mockClear()
    from.mockClear()
    where.mockClear()
  })

  it('rejects unauthenticated requests with 401', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/reviews/templates' })
    event.context.session = null
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns templates for a non-admin member scoped to their workspace', async () => {
    orderBy.mockResolvedValue([
      { id: 'tpl-1', name: 'Default', isDefault: true },
      { id: 'tpl-2', name: 'Design', isDefault: false },
    ])

    const event = createMockEvent({ method: 'GET', path: '/api/reviews/templates' })
    // A regular buddy (no admin role) with workspace context.
    event.context.session = { user: { id: 'buddy-1', role: 'user' } }
    event.context.user = { workspaceId: 'ws-1' }

    const res = await handler(event)

    expect(res).toMatchObject({
      success: true,
      templates: [
        { id: 'tpl-1', isDefault: true },
        { id: 'tpl-2', isDefault: false },
      ],
    })
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when the caller has no workspace context', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/reviews/templates' })
    event.context.session = { user: { id: 'buddy-1', role: 'user' } }
    event.context.user = {}

    const res = await handler(event)

    expect(res).toEqual({ success: true, templates: [] })
    // No DB query when there's no workspace to scope to.
    expect(select).not.toHaveBeenCalled()
  })
})
