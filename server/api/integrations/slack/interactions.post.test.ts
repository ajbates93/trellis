import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import { buildUser, buildFeedback } from '#server/__tests__/helpers/factories'
import { verifySlackSignature, getSlackUserInfo } from '#server/utils/slack'
import { notifyBuddyOfNewFeedback } from '#server/utils/notifications'

const { mockDb, mockSelect, mockInsert } = createMockDb()

vi.mock('../../../database/connection', () => ({
  db: mockDb,
  // Pass-through: the feedback insert runs directly against mockDb.
  withWorkspace: (_ctx: unknown, fn: () => unknown) => fn(),
}))

vi.mock('../../../utils/encryption', () => ({
  decrypt: vi.fn().mockImplementation((token: string) => token),
}))

vi.mock('../../../utils/slack', () => ({
  verifySlackSignature: vi.fn(),
  getSlackUserInfo: vi.fn(),
}))

vi.mock('../../../utils/notifications', () => ({
  notifyBuddyOfNewFeedback: vi.fn(),
}))

const mockReadRawBody = vi.fn()
vi.stubGlobal('readRawBody', mockReadRawBody)

const { default: handler } = await import('./interactions.post')

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
  email: 'reviewer@example.com',
  name: 'Reviewer User',
}

// Build a valid view_submission payload string
function buildPayload(overrides: Record<string, unknown> = {}) {
  const defaultPayload = {
    type: 'view_submission',
    user: { id: 'USLACK123' },
    team: { id: 'T12345' },
    view: {
      callback_id: 'feedback_submission',
      state: {
        values: {
          recipient_block: {
            recipient_select: {
              selected_option: { value: 'user-2' },
            },
          },
          feedback_block: {
            feedback_input: {
              value: 'This is great feedback with more than ten chars',
            },
          },
        },
      },
    },
    ...overrides,
  }
  return JSON.stringify(defaultPayload)
}

// Build URL-encoded body with payload field
function buildInteractionBody(payloadStr: string) {
  return new URLSearchParams({ payload: payloadStr }).toString()
}

describe('POST /api/integrations/slack/interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('readRawBody', mockReadRawBody)
    ;(verifySlackSignature as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockResolvedValue(mockSlackUser)
  })

  it('returns 400 when body is missing', async () => {
    mockReadRawBody.mockResolvedValueOnce(null)

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Missing request body'),
    })
  })

  it('returns 401 when Slack signature is invalid', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    ;(verifySlackSignature as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining('Invalid Slack signature'),
    })
  })

  it('returns 400 when payload field is missing from body', async () => {
    mockReadRawBody.mockResolvedValueOnce('command=%2Fsubmit&text=hello')

    const event = createMockEvent({ method: 'POST' })

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Missing payload'),
    })
  })

  it('returns clear action for non view_submission payload types', async () => {
    const body = buildInteractionBody(buildPayload({ type: 'block_actions' }))
    mockReadRawBody.mockResolvedValueOnce(body)

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toEqual({ response_action: 'clear' })
  })

  it('returns clear action when callback_id is not feedback_submission', async () => {
    const body = buildInteractionBody(
      buildPayload({
        view: {
          callback_id: 'some_other_modal',
          state: { values: {} },
        },
      })
    )
    mockReadRawBody.mockResolvedValueOnce(body)

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toEqual({ response_action: 'clear' })
  })

  it('returns validation errors when recipient is missing', async () => {
    const payloadWithoutRecipient = buildPayload({
      view: {
        callback_id: 'feedback_submission',
        state: {
          values: {
            recipient_block: {
              recipient_select: { selected_option: null },
            },
            feedback_block: {
              feedback_input: { value: 'Some feedback content here' },
            },
          },
        },
      },
    })
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(payloadWithoutRecipient))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        recipient_block: 'Please select a recipient',
      },
    })
  })

  it('returns validation errors when feedback content is missing', async () => {
    const payloadWithoutContent = buildPayload({
      view: {
        callback_id: 'feedback_submission',
        state: {
          values: {
            recipient_block: {
              recipient_select: { selected_option: { value: 'user-2' } },
            },
            feedback_block: {
              feedback_input: { value: null },
            },
          },
        },
      },
    })
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(payloadWithoutContent))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: 'Please enter feedback',
      },
    })
  })

  it('returns validation error when feedback is too short (less than 10 chars)', async () => {
    const payloadShort = buildPayload({
      view: {
        callback_id: 'feedback_submission',
        state: {
          values: {
            recipient_block: {
              recipient_select: { selected_option: { value: 'user-2' } },
            },
            feedback_block: {
              feedback_input: { value: 'Short' },
            },
          },
        },
      },
    })
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(payloadShort))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining('at least 10 characters'),
      },
    })
  })

  it('returns validation error when feedback is too long (more than 3000 chars)', async () => {
    const longContent = 'a'.repeat(3001)
    const payloadLong = buildPayload({
      view: {
        callback_id: 'feedback_submission',
        state: {
          values: {
            recipient_block: {
              recipient_select: { selected_option: { value: 'user-2' } },
            },
            feedback_block: {
              feedback_input: { value: longContent },
            },
          },
        },
      },
    })
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(payloadLong))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining('less than 3000 characters'),
      },
    })
  })

  it('returns error when slack workspace is not found', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    // No slack workspace
    mockSelect([])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining('Slack workspace not found'),
      },
    })
  })

  it('returns error when getSlackUserInfo throws', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Slack API down'))

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining('Failed to retrieve your profile'),
      },
    })
  })

  it('returns error when slack user has no email', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    ;(getSlackUserInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'USLACK123', email: null })

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining("doesn't have an email"),
      },
    })
  })

  it('returns error when reviewer Trellis user not found or in wrong workspace', async () => {
    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    // No Trellis user for this email
    mockSelect([])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining("haven't been invited"),
      },
    })
  })

  it('returns error when reviewee is not found in workspace', async () => {
    const reviewer = buildUser({ id: 'user-1', email: 'reviewer@example.com', workspaceId: 'workspace-1' })

    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    // Reviewer found
    mockSelect([reviewer])
    // Reviewee not found
    mockSelect([])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        recipient_block: expect.stringContaining('not found in workspace'),
      },
    })
  })

  it('returns error when reviewer tries to give feedback to themselves', async () => {
    // reviewer and reviewee have same id
    const reviewer = buildUser({ id: 'user-2', email: 'reviewer@example.com', workspaceId: 'workspace-1' })

    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    mockSelect([reviewer])
    // reviewee is the same user (id: user-2 matches the payload recipient value 'user-2')
    mockSelect([{ ...reviewer }])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        recipient_block: expect.stringContaining('cannot give feedback to yourself'),
      },
    })
  })

  it('submits feedback successfully and returns update action', async () => {
    const reviewer = buildUser({ id: 'user-1', email: 'reviewer@example.com', workspaceId: 'workspace-1' })
    const reviewee = buildUser({ id: 'user-2', email: 'other@example.com', workspaceId: 'workspace-1', name: 'Other User' })
    const newFeedback = buildFeedback({ reviewerId: 'user-1', revieweeId: 'user-2', published: false })

    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    mockSelect([reviewer])
    mockSelect([reviewee])
    mockInsert([newFeedback])

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(notifyBuddyOfNewFeedback).toHaveBeenCalledWith(reviewee.id)
    expect(result).toMatchObject({
      response_action: 'update',
      view: expect.objectContaining({
        type: 'modal',
        callback_id: 'feedback_success',
      }),
    })
  })

  it('returns error action when db insert throws', async () => {
    const reviewer = buildUser({ id: 'user-1', email: 'reviewer@example.com', workspaceId: 'workspace-1' })
    const reviewee = buildUser({ id: 'user-2', email: 'other@example.com', workspaceId: 'workspace-1' })

    mockReadRawBody.mockResolvedValueOnce(buildInteractionBody(buildPayload()))
    mockSelect([mockSlackWorkspace])
    mockSelect([reviewer])
    mockSelect([reviewee])
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('DB connection lost')
    })

    const event = createMockEvent({ method: 'POST' })
    const result = await handler(event)

    expect(result).toMatchObject({
      response_action: 'errors',
      errors: {
        feedback_block: expect.stringContaining('Failed to submit feedback'),
      },
    })
  })
})
