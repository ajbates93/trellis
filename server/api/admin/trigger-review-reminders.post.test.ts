import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

// Mock runTask (Nuxt server task)
vi.stubGlobal('runTask', vi.fn().mockResolvedValue({ sent: 2 }))

const { default: handler } = await import('./trigger-review-reminders.post')

describe('POST /api/admin/trigger-review-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('triggers review reminders and returns result', async () => {
    const event = createMockEvent()
    const result = await handler(event)

    expect(result).toEqual({ success: true, result: { sent: 2 } })
  })
})
