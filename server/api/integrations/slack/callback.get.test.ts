import { createHmac } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { auth } from '#server/utils/auth'

const { mockDb, mockSelect, mockInsert, mockUpdate } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

// Mock auth module
vi.mock('../../../utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

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

// Helper: mock an admin session
function mockAdminSession() {
  ;(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      workspaceId: 'workspace-1',
      isSuperAdmin: false,
    },
  })
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
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when state is missing', async () => {
    const event = createMockEvent({
      query: { code: 'oauth-code-123' },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
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
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
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
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when Slack token exchange fails', async () => {
    mockFetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        ok: false,
        error: 'invalid_code',
      }),
    })

    const event = createMockEvent({
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when session is not found (user not logged in)', async () => {
    mockSlackTokenSuccess()
    ;(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const event = createMockEvent({
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('redirects to error page when session user is not admin', async () => {
    mockSlackTokenSuccess()
    ;(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
        workspaceId: 'workspace-1',
        isSuperAdmin: false,
      },
    })

    const event = createMockEvent({
      query: {
        code: 'oauth-code-123',
        state: buildState(),
      },
    })

    await handler(event)

    expect(mockSendRedirect).toHaveBeenCalledTimes(1)
    const redirectUrl: string = mockSendRedirect.mock.calls[0][1]
    expect(redirectUrl).toContain('/settings/integrations?error=')
  })

  it('creates new slack workspace record and redirects to success page', async () => {
    mockSlackTokenSuccess()
    mockAdminSession()

    // No existing slack workspace
    mockSelect([])
    // Insert new record
    mockInsert([{ id: 'slack-ws-new' }])

    const event = createMockEvent({
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
  })

  it('updates existing slack workspace record and redirects to success page', async () => {
    mockSlackTokenSuccess()
    mockAdminSession()

    // Existing slack workspace found
    mockSelect([{ id: 'slack-ws-existing', slackTeamId: 'T12345' }])
    // Update existing record
    mockUpdate([{ id: 'slack-ws-existing' }])

    const event = createMockEvent({
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
