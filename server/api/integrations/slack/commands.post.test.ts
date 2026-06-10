import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'
import {
  verifySlackSignature,
  getSlackUserInfo,
  openSlackModal,
} from '#server/utils/slack'

const { mockDb, mockSelect } = createMockDb()

vi.mock('../../../database/connection', () => ({ db: mockDb }))

vi.mock('../../../utils/encryption', () => ({
  decrypt: vi.fn().mockImplementation((token: string) => token),
}))

vi.mock('../../../utils/slack', () => ({
  verifySlackSignature: vi.fn(),
  getSlackUserInfo: vi.fn(),
  openSlackModal: vi.fn(),
  buildFeedbackModal: vi.fn().mockReturnValue({ type: 'modal' }),
  extractUserIdFromMention: vi.fn().mockReturnValue(null),
  extractMentionedName: vi.fn().mockReturnValue(null),
  extractFeedbackText: vi.fn().mockReturnValue(null),
}))

const mockReadRawBody = vi.fn()
vi.stubGlobal('readRawBody', mockReadRawBody)

const { default: handler } = await import('./commands.post')

// Build URL-encoded form body for /submit command
function buildCommandBody(overrides: Record<string, string> = {}) {
  const params = new URLSearchParams({
    command: '/submit',
    text: '',
    user_id: 'USLACK123',
    team_id: 'T12345',
    trigger_id: 'trigger-abc',
    ...overrides,
  })
  return params.toString()
}

const mockSlackWorkspace = {
  id: 'slack-ws-1',
  slackTeamId: 'T12345',
  slackTeamName: 'Test Team',
  accessToken: 'xoxb-test-token',
  botUserId: 'UBOT123',
  workspaceId: 'workspace-1',
  installedBy: 'admin-1',
  installedAt: new Date('2025-01-10'),
}

const mockSlackUser = {
  id: 'USLACK123',
  email: 'test@example.com',
  name: 'Test User',
}

describe('POST /api/integrations/slack/commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readRawBody', mockReadRawBody)
    ;(verifySlackSignature as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockSlackUser)
    ;(openSlackModal as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it('returns ephemeral error when body is missing', async () => {
    mockReadRawBody.mockResolvedValueOnce(null)

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('No request body'),
    })
  })

  it('returns ephemeral error when Slack signature is invalid', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    ;(verifySlackSignature as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Invalid signature'),
    })
  })

  it('returns ephemeral error for unknown command', async () => {
    const body = buildCommandBody({ command: '/unknown' })
    mockReadRawBody.mockResolvedValueOnce(body)

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Unknown command'),
    })
  })

  it('returns ephemeral message when slack workspace not configured', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    // No slack workspace found
    mockSelect([])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Slack integration not configured'),
    })
  })

  it('returns ephemeral message when Trellis user not found for slack email', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    // Slack workspace found
    mockSelect([mockSlackWorkspace])
    // No Trellis user matching email
    mockSelect([])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining("haven't been invited"),
    })
  })

  it('returns ephemeral message when Trellis user is in a different workspace', async () => {
    const trellisUser = buildUser({ id: 'user-1', email: 'test@example.com', workspaceId: 'other-workspace' })

    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    mockSelect([trellisUser])
    // workspace users query is not reached when user is in wrong workspace

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('different workspace'),
    })
  })

  it('returns ephemeral message when no other users in workspace', async () => {
    const trellisUser = { id: 'only-user-a', email: 'test@example.com', name: 'Test User', workspaceId: 'workspace-1' }

    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    mockSelect([trellisUser])
    // workspace users - only the requester themselves (after filter, recipients is empty)
    mockSelect([{ id: 'only-user-a', name: 'Test User', email: 'test@example.com' }])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('No other users found'),
    })
  })

  it('opens feedback modal and returns empty string on success', async () => {
    const trellisUser = { id: 'trellis-user-a', email: 'test@example.com', name: 'Test User', workspaceId: 'workspace-1' }

    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    mockSelect([trellisUser])
    // workspace users includes self and another; handler filters out self
    mockSelect([
      { id: 'trellis-user-a', name: 'Test User', email: 'test@example.com' },
      { id: 'trellis-user-b', name: 'Other User', email: 'other@example.com' },
    ])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(openSlackModal).toHaveBeenCalledWith(
      mockSlackWorkspace.accessToken,
      'trigger-abc',
      expect.anything()
    )
    expect(result).toBe('')
  })

  it('returns ephemeral error when openSlackModal throws', async () => {
    const trellisUser = { id: 'trellis-user-a', email: 'test@example.com', name: 'Test User', workspaceId: 'workspace-1' }

    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    mockSelect([trellisUser])
    mockSelect([
      { id: 'trellis-user-a', name: 'Test User', email: 'test@example.com' },
      { id: 'trellis-user-b', name: 'Other User', email: 'other@example.com' },
    ])
    ;(openSlackModal as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Slack API error'))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Failed to open feedback form'),
    })
  })

  it('returns ephemeral error when getSlackUserInfo throws', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Slack API down'))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining('Failed to retrieve your Slack profile'),
    })
  })

  it('returns ephemeral message when slack user has no email', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildCommandBody())
    mockSelect([mockSlackWorkspace])
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'USLACK123', email: null })

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_type: 'ephemeral',
      text: expect.stringContaining("doesn't have an email"),
    })
  })
})
