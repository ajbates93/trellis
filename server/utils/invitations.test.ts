import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockDb } from '#server/__tests__/helpers/mock-db'

const { mockDb, mockInsert } = createMockDb()
vi.mock('../database/connection', () => ({ db: mockDb }))
const sendEmail = vi.fn().mockResolvedValue(undefined)
vi.mock('../utils/email', () => ({ sendEmail, emailTemplates: { invitation: (n: string, u: string) => `${n}:${u}` } }))

const { sendUserInvitation } = await import('./invitations')

describe('sendUserInvitation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('creates a verification token and emails the set-password link', async () => {
    mockInsert([])
    await sendUserInvitation({ id: 'u1', name: 'Sam', email: 'sam@acme.com' })
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const arg = sendEmail.mock.calls[0]![0]
    expect(arg.to).toBe('sam@acme.com')
    expect(arg.html).toContain('/set-password?token=')
  })
})
