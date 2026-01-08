import { describe, it, expect } from 'vitest'
import * as apiSchemas from '../api'

describe('API Schemas', () => {
  describe('CreateFeedbackRequestSchema', () => {
    it('should validate valid feedback request', () => {
      const validRequest = {
        revieweeId: 'user-123',
        content: 'Great work on the project! You demonstrated excellent attention to detail.',
      }
      const result = apiSchemas.CreateFeedbackRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject feedback without revieweeId', () => {
      const invalidRequest = {
        content: 'Great work on the project!',
      }
      const result = apiSchemas.CreateFeedbackRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject feedback with content too short', () => {
      const invalidRequest = {
        revieweeId: 'user-123',
        content: 'Short',
      }
      const result = apiSchemas.CreateFeedbackRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject feedback with content too long', () => {
      const invalidRequest = {
        revieweeId: 'user-123',
        content: 'a'.repeat(5001),
      }
      const result = apiSchemas.CreateFeedbackRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateGoalRequestSchema', () => {
    it('should validate valid goal request', () => {
      const validRequest = {
        goalText: 'Master TypeScript advanced types',
        description: 'Learn generics, conditional types, mapped types',
        targetDate: '2025-06-01',
      }
      const result = apiSchemas.CreateGoalRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should allow optional fields', () => {
      const validRequest = {
        goalText: 'Master TypeScript',
      }
      const result = apiSchemas.CreateGoalRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject goal text too short', () => {
      const invalidRequest = {
        goalText: 'Learn',
      }
      const result = apiSchemas.CreateGoalRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject goal text too long', () => {
      const invalidRequest = {
        goalText: 'a'.repeat(501),
      }
      const result = apiSchemas.CreateGoalRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateGoalStatusRequestSchema', () => {
    it('should validate valid status update', () => {
      const validRequest = {
        status: 'completed',
      }
      const result = apiSchemas.UpdateGoalStatusRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject all valid statuses', () => {
      const validRequest = {
        status: 'active',
      }
      const result = apiSchemas.UpdateGoalStatusRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const invalidRequest = {
        status: 'invalid-status',
      }
      const result = apiSchemas.UpdateGoalStatusRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateMilestoneRequestSchema', () => {
    it('should validate valid milestone request', () => {
      const validRequest = {
        title: 'Complete tutorial',
      }
      const result = apiSchemas.CreateMilestoneRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject title too short', () => {
      const invalidRequest = {
        title: 'ab',
      }
      const result = apiSchemas.CreateMilestoneRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject title too long', () => {
      const invalidRequest = {
        title: 'a'.repeat(256),
      }
      const result = apiSchemas.CreateMilestoneRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('PublishBatchFeedbackRequestSchema', () => {
    it('should validate valid batch publish request', () => {
      const validRequest = {
        feedbackIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        publish: true,
      }
      const result = apiSchemas.PublishBatchFeedbackRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      const invalidRequest = {
        feedbackIds: ['not-a-uuid'],
        publish: true,
      }
      const result = apiSchemas.PublishBatchFeedbackRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject empty feedback IDs array', () => {
      const invalidRequest = {
        feedbackIds: [],
        publish: true,
      }
      const result = apiSchemas.PublishBatchFeedbackRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateUserRequestSchema', () => {
    it('should validate valid user creation request', () => {
      const validRequest = {
        email: 'john@example.com',
        name: 'John Doe',
        roleType: 'dev',
      }
      const result = apiSchemas.CreateUserRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
        name: 'John Doe',
      }
      const result = apiSchemas.CreateUserRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const invalidRequest = {
        email: 'john@example.com',
        name: '',
      }
      const result = apiSchemas.CreateUserRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should allow optional roleType and buddyEmail', () => {
      const validRequest = {
        email: 'john@example.com',
        name: 'John Doe',
      }
      const result = apiSchemas.CreateUserRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept all valid role types', () => {
      const roleTypes = ['dev', 'design', 'qa', 'growth']
      roleTypes.forEach((roleType) => {
        const validRequest = {
          email: 'john@example.com',
          name: 'John Doe',
          roleType,
        }
        const result = apiSchemas.CreateUserRequestSchema.safeParse(validRequest)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid role type', () => {
      const invalidRequest = {
        email: 'john@example.com',
        name: 'John Doe',
        roleType: 'invalid-role',
      }
      const result = apiSchemas.CreateUserRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('OnboardingImportRequestSchema', () => {
    it('should validate valid CSV import request', () => {
      const validRequest = {
        csv: 'email,name,roleType\njohn@example.com,John Doe,dev',
        filename: 'users.csv',
      }
      const result = apiSchemas.OnboardingImportRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject empty CSV', () => {
      const invalidRequest = {
        csv: '',
      }
      const result = apiSchemas.OnboardingImportRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should allow optional filename', () => {
      const validRequest = {
        csv: 'email,name\njohn@example.com,John Doe',
      }
      const result = apiSchemas.OnboardingImportRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })
  })

  describe('SuccessResponseSchema', () => {
    it('should validate success response', () => {
      const validResponse = {
        success: true,
      }
      const result = apiSchemas.SuccessResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should validate failure response', () => {
      const validResponse = {
        success: false,
      }
      const result = apiSchemas.SuccessResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('ErrorResponseSchema', () => {
    it('should validate error response with all fields', () => {
      const validResponse = {
        statusCode: 400,
        message: 'Bad request',
        data: { field: 'email', error: 'Invalid format' },
      }
      const result = apiSchemas.ErrorResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should validate error response without data', () => {
      const validResponse = {
        statusCode: 500,
        message: 'Internal server error',
      }
      const result = apiSchemas.ErrorResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should require statusCode and message', () => {
      const invalidResponse = {
        statusCode: 400,
      }
      const result = apiSchemas.ErrorResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })
  })
})
