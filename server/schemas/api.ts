import { z } from 'zod';
import { GoalMilestoneSchema } from './base';
import {
  GoalWithMilestonesSchema,
  FeedbackWithReviewerSchema,
  FeedbackWithRevieweeSchema,
  UserWithBuddySchema,
  ReviewScheduleWithUsersSchema,
  BuddyCheckinWithUsersSchema,
} from './computed';

// ===== FEEDBACK API SCHEMAS =====

export const CreateFeedbackRequestSchema = z.object({
  revieweeId: z.string().min(1, 'Reviewee ID is required'),
  content: z.string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(5000, 'Feedback must be less than 5000 characters'),
});

export const CreateFeedbackResponseSchema = z.object({
  success: z.boolean(),
  feedback: z.object({
    id: z.uuid(),
    reviewerId: z.string(),
    revieweeId: z.string(),
    content: z.string(),
    weekYear: z.string().nullable(),
    isRead: z.boolean().nullable(),
  }),
});

export const GetReceivedFeedbackResponseSchema = z.object({
  feedback: z.array(FeedbackWithReviewerSchema),
});

export const GetGivenFeedbackResponseSchema = z.object({
  feedback: z.array(FeedbackWithRevieweeSchema),
});

export const MarkFeedbackAsReadRequestSchema = z.object({
  isRead: z.boolean(),
});

export const PublishFeedbackRequestSchema = z.object({
  publish: z.boolean(),
});

export const PublishBatchFeedbackRequestSchema = z.object({
  feedbackIds: z.array(z.uuid()).min(1, 'At least one feedback ID is required'),
  publish: z.boolean(),
});

export const GetReceivedCountResponseSchema = z.object({
  unreadCount: z.int().nonnegative(),
  totalCount: z.int().nonnegative(),
});

// ===== GOALS API SCHEMAS =====

export const CreateGoalRequestSchema = z.object({
  goalText: z.string()
    .min(10, 'Goal text must be at least 10 characters')
    .max(500, 'Goal text must be less than 500 characters'),
  description: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export const UpdateGoalRequestSchema = z.object({
  goalText: z.string()
    .min(10, 'Goal text must be at least 10 characters')
    .max(500, 'Goal text must be less than 500 characters')
    .optional(),
  description: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export const UpdateGoalStatusRequestSchema = z.object({
  status: z.enum(['active', 'completed', 'archived'], {
    errorMap: () => ({ message: 'Status must be one of: active, completed, archived' }),
  }),
});

export const GetGoalsResponseSchema = z.object({
  goals: z.array(GoalWithMilestonesSchema),
});

export const CreateGoalResponseSchema = z.object({
  success: z.boolean(),
  goal: GoalWithMilestonesSchema,
});

export const UpdateGoalResponseSchema = z.object({
  success: z.boolean(),
  goal: GoalWithMilestonesSchema,
});

// ===== GOAL MILESTONE SCHEMAS =====

export const CreateMilestoneRequestSchema = z.object({
  title: z.string()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(255, 'Milestone title must be less than 255 characters'),
});

export const UpdateMilestoneRequestSchema = z.object({
  title: z.string()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(255, 'Milestone title must be less than 255 characters')
    .optional(),
  isCompleted: z.boolean().optional(),
});

export const ReorderMilestonesRequestSchema = z.object({
  milestones: z.array(z.object({
    id: z.uuid(),
    displayOrder: z.int().nonnegative(),
  })),
});

export const CreateMilestoneResponseSchema = z.object({
  success: z.boolean(),
  milestone: GoalMilestoneSchema,
});

export const UpdateMilestoneResponseSchema = z.object({
  success: z.boolean(),
  milestone: GoalMilestoneSchema,
});

// ===== ADMIN USER SCHEMAS =====

export const CreateUserRequestSchema = z.object({
  email: z.email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  roleType: z.enum(['dev', 'design', 'qa']).optional(),
  buddyEmail: z.email('Invalid buddy email').optional().nullable(),
  nextReviewDate: z.string().nullable().optional(),
});

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  email: z.email('Invalid email address').optional(),
  roleType: z.enum(['dev', 'design', 'qa']).optional().nullable(),
  buddyEmail: z.email('Invalid buddy email').optional().nullable(),
  nextReviewDate: z.string().nullable().optional(),
  role: z.enum(['user', 'admin']).optional(),
  banned: z.boolean().optional(),
});

export const GetUsersResponseSchema = z.object({
  users: z.array(UserWithBuddySchema),
  counts: z.object({
    all: z.int().nonnegative(),
    active: z.int().nonnegative(),
    invited: z.int().nonnegative(),
  }),
});

export const CreateUserResponseSchema = z.object({
  success: z.boolean(),
  user: UserWithBuddySchema,
});

export const UpdateUserResponseSchema = z.object({
  success: z.boolean(),
  user: UserWithBuddySchema,
});

// ===== ADMIN ONBOARDING SCHEMAS =====

export const CSVRowSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  roleType: z.string().optional(),
  buddyEmail: z.email().optional(),
  nextReviewDate: z.string().optional(),
});

export const OnboardingImportRequestSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
  filename: z.string().optional(),
});

export const OnboardingImportResponseSchema = z.object({
  success: z.boolean(),
  rowsImported: z.int().nonnegative(),
  errors: z.array(z.object({
    row: z.int().positive(),
    field: z.string(),
    message: z.string(),
  })),
});

// ===== REVIEW SCHEDULE SCHEMAS =====

export const CreateReviewScheduleRequestSchema = z.object({
  buddyId: z.string().min(1, 'Buddy ID is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  name: z.string().optional(),
});

export const UpdateReviewScheduleRequestSchema = z.object({
  scheduledDate: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'rescheduled']).optional(),
  completionNotes: z.string().nullable().optional(),
});

export const GetReviewSchedulesResponseSchema = z.object({
  schedules: z.array(ReviewScheduleWithUsersSchema),
});

export const CreateReviewScheduleResponseSchema = z.object({
  success: z.boolean(),
  schedule: ReviewScheduleWithUsersSchema,
});

// ===== BUDDY CHECK-IN SCHEMAS =====

export const CreateBuddyCheckinRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  notes: z.string()
    .min(10, 'Check-in notes must be at least 10 characters')
    .max(5000, 'Check-in notes must be less than 5000 characters'),
  reviewScheduleId: z.uuid().optional().nullable(),
});

export const GetBuddyCheckinsResponseSchema = z.object({
  checkins: z.array(BuddyCheckinWithUsersSchema),
});

export const CreateBuddyCheckinResponseSchema = z.object({
  success: z.boolean(),
  checkin: BuddyCheckinWithUsersSchema,
});

// ===== GENERIC RESPONSE SCHEMAS =====

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  statusCode: z.int(),
  message: z.string(),
  data: z.any().optional(),
});
