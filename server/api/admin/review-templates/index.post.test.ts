import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const insertReturning = vi.fn()
const insertValues = vi.fn(() => ({ returning: insertReturning }))
const selectLimit = vi.fn()

vi.mock('#server/database/connection', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: selectLimit }) }),
    }),
    insert: () => ({ values: insertValues }),
  },
}))

// A valid body that passes CreateReviewTemplateRequestSchema. We mock
// validateBody (which otherwise needs a real H3 request stream to read the
// body) to return this object, but buildSnapshot still runs for real in the
// handler against these fields.
const validBody = {
  name: 'Developer',
  description: 'For devs',
  fields: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      type: 'long_text' as const,
      label: 'What did you learn?',
      required: false,
    },
  ],
}

vi.mock('#server/utils/validation', () => ({
  validateBody: vi.fn(async () => validBody),
}))

const { default: handler } = await import('./index.post')

describe('POST /api/admin/review-templates', () => {
  beforeEach(() => {
    insertReturning.mockReset()
    insertValues.mockClear()
    selectLimit.mockReset()
    selectLimit.mockResolvedValue([{ workspaceId: 'ws-1' }])
  })

  it('rejects unauthenticated requests with 401', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/admin/review-templates',
    })
    event.context.session = null
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects non-admins with 403', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/admin/review-templates',
    })
    event.context.session = { user: { id: 'u1', role: 'member' } }
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('creates a template scoped to the admin\'s workspace', async () => {
    insertReturning.mockResolvedValue([{ id: 'tpl-1', name: 'Developer' }])

    const event = createMockEvent({
      method: 'POST',
      path: '/api/admin/review-templates',
    })
    event.context.session = { user: { id: 'admin-1', role: 'admin' } }

    const res = await handler(event)

    expect(res).toMatchObject({ success: true, template: { id: 'tpl-1' } })

    // Verify the insert was scoped to the admin's resolved workspace and that
    // server-controlled fields are set correctly.
    expect(insertValues).toHaveBeenCalledTimes(1)
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        name: 'Developer',
        description: 'For devs',
        isDefault: false,
        createdBy: 'admin-1',
        fields: validBody.fields,
      }),
    )
  })
})
