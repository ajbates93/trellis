import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const mockSendRedirect = vi.fn()
vi.stubGlobal('sendRedirect', mockSendRedirect)

const { default: handler } = await import('./hostname')

function eventWithHost(host: string, path: string, env: string = 'production') {
  const event = createMockEvent({ path })
  event.node.req.headers.host = host
  process.env.NODE_ENV = env
  return event
}

describe('hostname middleware', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('does nothing in development', async () => {
    const event = eventWithHost('jointrellis.app', '/dashboard', 'development')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('redirects app routes from apex to app subdomain', async () => {
    const event = eventWithHost('jointrellis.app', '/dashboard')
    await handler(event)
    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      'https://my.jointrellis.app/dashboard',
      302,
    )
  })

  it('allows the apex root to render marketing page', async () => {
    const event = eventWithHost('jointrellis.app', '/')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('allows the demo-request api on apex', async () => {
    const event = eventWithHost('jointrellis.app', '/api/marketing/demo-request')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('redirects /landing on the app subdomain to apex', async () => {
    const event = eventWithHost('my.jointrellis.app', '/landing')
    await handler(event)
    expect(mockSendRedirect).toHaveBeenCalledWith(
      event,
      'https://jointrellis.app/landing',
      302,
    )
  })

  it('allows app routes on app subdomain', async () => {
    const event = eventWithHost('my.jointrellis.app', '/dashboard')
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })

  it('handles missing host header gracefully', async () => {
    const event = createMockEvent({ path: '/' })
    delete event.node.req.headers.host
    process.env.NODE_ENV = 'production'
    await handler(event)
    expect(mockSendRedirect).not.toHaveBeenCalled()
  })
})
