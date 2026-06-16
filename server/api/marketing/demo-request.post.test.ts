import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEvent } from '#server/__tests__/helpers/mock-event'
import type { z } from 'zod'
import { createError } from 'h3'

const mockReturning = vi.fn()
vi.mock('../../database/connection', () => ({
  db: {
    insert: () => ({ values: () => ({ returning: mockReturning }) }),
  },
}))

// validateBody: runs the schema against the mock body so validation tests work
const mockValidateBody = vi.fn().mockImplementation(async (event: any, schema: z.ZodType) => {
  const body = event._mockBody ?? {}
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Validation failed' })
  }
  return result.data
})

vi.mock('../../utils/validation', () => ({
  validateBody: mockValidateBody,
  validateResponse: vi.fn().mockImplementation((data: any) => data),
}))

const mockSendEmail = vi.fn()
vi.mock('../../utils/email', () => ({
  sendEmail: mockSendEmail,
  emailTemplates: {
    demoRequestInternal: vi.fn().mockReturnValue('<html>internal</html>'),
    demoRequestConfirmation: vi.fn().mockReturnValue('<html>confirmation</html>'),
  },
}))

const { default: handler } = await import('./demo-request.post')

describe('POST /api/marketing/demo-request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([{ id: 'test-uuid' }])
    mockSendEmail.mockResolvedValue({ id: 'email-id' })
    // Restore default validateBody implementation after clearAllMocks resets it
    mockValidateBody.mockImplementation(async (event: any, schema: z.ZodType) => {
      const body = event._mockBody ?? {}
      const result = schema.safeParse(body)
      if (!result.success) {
        throw createError({ statusCode: 400, message: 'Validation failed' })
      }
      return result.data
    })
  })

  it('accepts a valid submission, inserts a row, and sends two emails', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme',
        teamSize: '11-50',
        message: 'Looking for lighter reviews',
      },
    })

    const result = await handler(event)

    expect(result).toEqual({ ok: true })
    expect(mockReturning).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
  })

  it('rejects a submission with an invalid email', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane',
        email: 'not-an-email',
        company: 'Acme',
        teamSize: '11-50',
      },
    })

    await expect(handler(event)).rejects.toThrow()
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it('rejects a submission with a filled honeypot', async () => {
    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Bot',
        email: 'bot@example.com',
        company: 'Bots Inc',
        teamSize: '11-50',
        website: 'http://spam.example',
      },
    })

    await expect(handler(event)).rejects.toThrow()
    expect(mockReturning).not.toHaveBeenCalled()
  })

  it('still returns ok if the confirmation email fails', async () => {
    mockSendEmail
      .mockResolvedValueOnce({ id: 'internal' })
      .mockRejectedValueOnce(new Error('Resend down'))

    const event = createMockEvent({
      method: 'POST',
      body: {
        name: 'Jane',
        email: 'jane@example.com',
        company: 'Acme',
        teamSize: '2-10',
      },
    })

    const result = await handler(event)
    expect(result).toEqual({ ok: true })
  })
})
