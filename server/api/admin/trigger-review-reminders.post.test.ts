import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'

// Mock runTask (Nuxt server task)
const runTaskMock = vi.fn().mockResolvedValue({ sent: 2 })
vi.stubGlobal('runTask', runTaskMock)

const { default: handler } = await import('./trigger-review-reminders.post')

describe('POST /api/admin/trigger-review-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    await expect(handler(createUnauthenticatedEvent())).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 for a non-admin user', async () => {
    await expect(handler(createAuthenticatedEvent())).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('triggers reminders scoped to the admin workspace and returns result', async () => {
    const event = createAdminEvent({
      session: {
        user: {
          id: 'admin-1',
          email: 'admin@ws1.io',
          name: 'WS1 Admin',
          role: 'admin',
          workspaceId: 'ws-1',
        },
      },
    })

    const result = await handler(event)

    // The trigger must pass the caller's workspaceId so it cannot fire
    // platform-wide (F14).
    expect(runTaskMock).toHaveBeenCalledWith('review-reminders', {
      payload: { workspaceId: 'ws-1' },
    })
    expect(result).toEqual({ success: true, result: { sent: 2 } })
  })
})
