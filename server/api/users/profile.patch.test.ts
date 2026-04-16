import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'
import {
  createAuthenticatedEvent,
  createUnauthenticatedEvent,
} from '#server/__tests__/helpers/mock-event'
import { buildUser } from '#server/__tests__/helpers/factories'

const { mockDb, mockUpdate } = createMockDb()

vi.mock('../../database/connection', () => ({ db: mockDb }))
vi.mock('../../utils/validation', () => ({
  validateBody: vi.fn().mockImplementation(async (event: any) => event._mockBody ?? {}),
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))
vi.mock('../../utils/workspace', () => ({
  getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
}))
vi.mock('../../utils/s3', () => ({
  uploadAvatarToS3: vi.fn().mockResolvedValue('https://s3.example.com/avatar.jpg'),
}))

// profile.patch.ts uses readBody() directly
const mockReadBody = vi.fn()
vi.stubGlobal('readBody', mockReadBody)

// Import handler after mocks are set up
const { default: handler } = await import('./profile.patch')

describe('PATCH /api/users/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('updates profile successfully with allowed fields', async () => {
    const updatedUser = buildUser({
      id: 'user-1',
      name: 'Updated Name',
      preferredName: 'Nick',
      pronouns: 'they/them',
      bio: 'A short bio',
      reviewPreference: 'remote',
      communicationPreferences: 'Slack is preferred',
      timezone: 'Europe/London',
      emailNotifications: false,
    })

    const returnedRow = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      preferredName: updatedUser.preferredName,
      pronouns: updatedUser.pronouns,
      bio: updatedUser.bio,
      reviewPreference: updatedUser.reviewPreference,
      communicationPreferences: updatedUser.communicationPreferences,
      timezone: updatedUser.timezone,
      avatarUrl: updatedUser.avatarUrl,
      image: updatedUser.image,
      roleType: updatedUser.roleType,
      buddyId: updatedUser.buddyId,
      nextReviewDate: updatedUser.nextReviewDate,
    }
    mockUpdate([returnedRow])

    mockReadBody.mockResolvedValueOnce({
      name: 'Updated Name',
      preferredName: 'Nick',
      pronouns: 'they/them',
      bio: 'A short bio',
      reviewPreference: 'remote',
      communicationPreferences: 'Slack is preferred',
      timezone: 'Europe/London',
      emailNotifications: false,
    })

    const event = createAuthenticatedEvent()
    const result = await handler(event)

    expect(result).toEqual({ success: true, user: returnedRow })
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('returns 500 when name exceeds 255 characters (catch block re-wraps validation errors)', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'a'.repeat(256) })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when preferred name exceeds 100 characters (catch block re-wraps validation errors)', async () => {
    mockReadBody.mockResolvedValueOnce({ preferredName: 'a'.repeat(101) })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when reviewPreference is invalid (catch block re-wraps validation errors)', async () => {
    mockReadBody.mockResolvedValueOnce({ reviewPreference: 'invalid-value' })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when timezone is invalid (catch block re-wraps validation errors)', async () => {
    mockReadBody.mockResolvedValueOnce({ timezone: 'Not/A/Real/Timezone' })

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('returns 500 when the user is not found in the database (catch block re-wraps 404)', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'Someone' })
    mockUpdate([])

    const event = createAuthenticatedEvent()

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
