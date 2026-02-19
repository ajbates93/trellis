import { vi } from 'vitest'

/**
 * Mock the workspace utility module.
 * Call this at the top of your test file or in vi.mock().
 */
export function mockWorkspaceUtils() {
  return {
    getWorkspaceId: vi.fn().mockReturnValue('workspace-1'),
    isSuperAdmin: vi.fn().mockReturnValue(false),
  }
}

/**
 * Mock the notifications module (fire-and-forget, no-op).
 */
export function mockNotifications() {
  return {
    notifyBuddyOfNewFeedback: vi.fn(),
    notifyRevieweeOfPublishedFeedback: vi.fn(),
  }
}

/**
 * Mock the validation module.
 * validateBody passes through the request body.
 * validateResponse passes through the data.
 */
export function mockValidation() {
  return {
    validateBody: vi.fn().mockImplementation(async (event: any) => {
      // Read body from the mock event's internal property
      return event._mockBody ?? {}
    }),
    validateResponse: vi.fn().mockImplementation((data: any) => data),
    safeValidate: vi.fn().mockImplementation((data: any) => ({ success: true, data })),
    isZodError: vi.fn().mockReturnValue(false),
  }
}

/**
 * Mock the auth utility module.
 */
export function mockAuth() {
  return {
    auth: {
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    },
  }
}

/**
 * Mock the email utility module.
 */
export function mockEmail() {
  return {
    sendEmail: vi.fn().mockResolvedValue(undefined),
    emailTemplates: {
      buddyFeedbackReceived: vi.fn().mockReturnValue('<html>mock</html>'),
      feedbackPublished: vi.fn().mockReturnValue('<html>mock</html>'),
    },
  }
}
