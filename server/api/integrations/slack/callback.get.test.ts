import { createHmac } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

vi.mock('../../../utils/encryption', () => ({
  encrypt: vi.fn().mockImplementation((token: string) => `encrypted:${token}`),
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

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { default: handler } = await import('./callback.get')

// Helper: build a valid HMAC-signed state with workspace-1 and recent timestamp
function buildState(overrides: Partial<{ workspaceId: string; nonce: string; timestamp: number }> = {}) {
  const stateData = {
    workspaceId: 'workspace-1',
    nonce: 'abc123',
    timestamp: Date.now(),
    ...overrides,
  }
  const payload = Buffer.from(JSON.stringify(stateData)).toString('base64')
  const hmac = createHmac('sha256', 'test-client-secret').update(payload).digest('hex')
  return `${payload}.${hmac}`
}

// Helper: mock a successful Slack token exchange
function mockSlackTokenSuccess() {
  mockFetch.mockResolvedValueOnce({
    json: vi.fn().mockResolvedValue({
      ok: true,
      access_token: 'xoxb-test-token',
      bot_user_id: 'UBOT123',
      team: { id: 'T12345', name: 'Test Team' },
    }),
  })
}

// Admin user set on the event context (auth middleware populates event.context.user)
const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  workspaceId: 'workspace-1',
  isSuperAdmin: false,
}

describe('GET /api/integrations/slack/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendRedirect.mockResolvedValue(undefined)
    vi.stubGlobal('sendRedirect', mockSendRedirect)
    vi.stubGlobal('fetch', mockFetch)
  })

  it('redirects to error page when OAuth error param is present', async () => {
    const event = createMockEvent({
      query: { error: 'access_denied' },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/settings/integrations?error=slack_oauth_failed'
    )
  })

  it('redirects to error page when code is missing', async () => {
    const event = createMockEvent({
      query: { state: buildState() },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when state is missing', async () => {
    const event = createMockEvent({
      query: { code: 'oauth-code-123' },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when state token is expired', async () => {
    const expiredTimestamp = Date.now() - 700000 // more than 10 minutes ago
    const event = createMockEvent({
      query: {
        code: 'oauth-code-123',
        state: buildState({ timestamp: expiredTimestamp }),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when state is invalid base64/JSON', async () => {
    const event = createMockEvent({
      query: {
        code: 'oauth-code-123',
        state: 'not-valid-base64!!',
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when Slack token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'invalid_code',
      }),
    })

    // Valid session + nonce so the request reaches the token exchange.
    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when session is not found (user not logged in)', async () => {
    // No user on the event context = unauthenticated
    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
    // Session checks run before the code exchange: no token was minted.
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('redirects to error page when session user is not admin', async () => {
    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
        workspaceId: 'workspace-1',
        isSuperAdmin: false,
      },
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a state minted for a different workspace than the session user (F6)', async () => {
    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: adminUser, // workspace-1
      query: {
        code: 'oauth-code-123',
        state: buildState({ workspaceId: 'workspace-2' }),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockDb.insert).not.toHaveBeenCalled()
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('rejects a callback without the install nonce cookie (state replay, F6)', async () => {
    const event = createMockEvent({
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a callback whose cookie nonce does not match the state nonce (F6)', async () => {
    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=some-other-nonce' },
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0]?.[1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses to re-bind a Slack team already linked to another workspace (F6)', async () => {
    mockSlackTokenSuccess()

    // Existing mapping for the same Slack team, owned by a DIFFERENT workspace
    mockSelect([
      { id: 'slack-ws-existing', slackTeamId: 'T12345', workspaceId: 'workspace-2' },
    ])

    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockDb.insert).not.toHaveBeenCalled()
    expect(mockDb.update).not.toHaveBeenCalled()
    expect(mockSendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/settings/integrations?error=slack_team_already_linked'
    )
  })

  it('creates new slack workspace record and redirects to success page', async () => {
    mockSlackTokenSuccess()

    // No existing slack workspace
    mockSelect([])
    // Insert new record
    mockInsert([{ id: 'slack-ws-new' }])

    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(mockDb.update).not.toHaveBeenCalled()
    expect(mockSendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/settings/integrations?success=slack_installed'
    )
    // The nonce cookie is consumed (cleared) on use.
    const setCookieHeader = event.node.res.getHeader('set-cookie')
    expect(String(setCookieHeader)).toContain('slack_install_nonce=')
    expect(String(setCookieHeader)).toContain('Max-Age=0')
  })

  it('updates an existing record owned by the SAME workspace (re-install)', async () => {
    mockSlackTokenSuccess()

    // Existing slack workspace found, owned by the caller's workspace
    mockSelect([
      { id: 'slack-ws-existing', slackTeamId: 'T12345', workspaceId: 'workspace-1' },
    ])
    // Update existing record
    mockUpdate([{ id: 'slack-ws-existing' }])

    const event = createMockEvent({
      headers: { cookie: 'slack_install_nonce=abc123' },
      user: adminUser,
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockDb.update).toHaveBeenCalledTimes(1)
    expect(mockDb.insert).not.toHaveBeenCalled()
    expect(mockSendRedirect).toHaveBeenCalledWith(
      expect.anything(),
      '/settings/integrations?success=slack_installed'
    )
  })
})
