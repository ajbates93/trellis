import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAdminEvent,
  createAuthenticatedEvent,
  createMockEvent,
} from '../../../__tests__/helpers/mock-event'

vi.mock('../../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  slackClientId: 'test-client-id',
  slackClientSecret: 'test-client-secret',
  slackSigningSecret: 'test-signing-secret',
  betterAuthUrl: 'http://localhost:3000',
  public: { baseUrl: 'http://localhost:3000' },
}))

const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal('sendRedirect', mockSendRedirect)

const { default: handler } = await import('./install.get')

describe('GET /api/integrations/slack/install', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-stub after clearAllMocks
    mockSendRedirect.mockResolvedValue(undefined)
    vi.stubGlobal('sendRedirect', mockSendRedirect)
  })

  it('returns 403 for non-admin users', async () => {
    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 403 for unauthenticated users (no user in context)', async () => {
    const event = createMockEvent()
    // no user on context

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('redirects to Slack OAuth URL for admin user', async () => {
    const event = createAdminEvent()

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    const parsed = new URL(redirectUrl)

    expect(parsed.hostname).toBe('slack.com')
    expect(parsed.pathname).toBe('/oauth/v2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
    expect(parsed.searchParams.get('scope')).toContain('commands')
    expect(parsed.searchParams.get('scope')).toContain('users:read')
    expect(parsed.searchParams.get('scope')).toContain('chat:write')
    expect(parsed.searchParams.get('state')).toBeTruthy()
    expect(parsed.searchParams.get('redirect_uri')).toContain('/api/integrations/slack/callback')
  })

  it('includes workspaceId in the state parameter', async () => {
    const event = createAdminEvent()

    await handler(event)

    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    const parsed = new URL(redirectUrl)
    const stateEncoded = parsed.searchParams.get('state')!
    const stateDecoded = JSON.parse(Buffer.from(stateEncoded, 'base64').toString())

    expect(stateDecoded.workspaceId).toBe('workspace-1')
    expect(stateDecoded.nonce).toBeTruthy()
    expect(stateDecoded.timestamp).toBeTypeOf('number')
  })

  it('redirects for superAdmin user', async () => {
    const event = createAuthenticatedEvent({
      session: {
        user: {
          id: 'super-1',
          email: 'super@example.com',
          name: 'Super Admin',
          role: 'user',
          workspaceId: 'workspace-1',
          isSuperAdmin: true,
        },
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('slack.com')
  })
})
