import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '../../__tests__/helpers/mock-event'

// Mock sendRedirect to capture the redirect URL
const mockSendRedirect = vi.fn()
vi.stubGlobal('sendRedirect', mockSendRedirect)

const { default: handler } = await import('./error.get')

describe('GET /api/auth/error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login with error message from query', async () => {
    const event = createMockEvent({
      query: { error: 'Something went wrong' },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      `/login?error=${encodeURIComponent('Something went wrong')}`,
      302
    )
  })

  it('redirects with default error when no error param', async () => {
    const event = createMockEvent()

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      `/login?error=${encodeURIComponent('Authentication failed')}`,
      302
    )
  })
})
