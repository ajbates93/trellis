import { z } from 'zod';
import {
  UserSchema,
  FeedbackSchema,
  ReviewScheduleSchema,
  GoalSchema,
  GoalMilestoneSchema,
  BuddyCheckinSchema,
} from './base';

// ===== FEEDBACK SCHEMAS =====

// For /api/feedback/received - feedback with reviewer info and review schedule
export const FeedbackWithReviewerSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  createdAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  isRead: z.boolean().nullable(),
  isRead: z.boolean().nullable(),
  // reviewScheduleId: z.uuid().nullable(),
  reviewer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    image: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  // review: z.object({
  //   id: z.uuid(),
  //   name: z.string().nullable(),
  //   scheduledDate: z.string(),
  // }).nullable(),
});

// For /api/feedback/given - feedback with reviewee info
export const FeedbackWithRevieweeSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  createdAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  isRead: z.boolean().nullable(),
  published: z.boolean().nullable(),
  weekYear: z.string().nullable(),
  weekYear: z.string().nullable(),
  // reviewScheduleId: z.uuid().nullable(),
  reviewee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    image: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
});

// ===== GOAL SCHEMAS =====

// For /api/goals - goals with milestones
export const GoalWithMilestonesSchema = GoalSchema.extend({
  milestones: z.array(GoalMilestoneSchema),
});

// ===== USER SCHEMAS =====

// For /api/admin/users - users with buddy info and computed status (lighter version)
export const UserWithBuddySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.string().nullable(),
  roleType: z.string().nullable(),
  buddyId: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  avatarUrl: z.string().nullable(),
  image: z.string().nullable(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  nextReviewDate: z.string().nullable(),
  buddyName: z.string().nullable(),
  status: z.enum(['active', 'invited']),
});

// For user profile pages - user with full public info
export const UserPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  preferredName: z.string().max(100).nullable(),
  pronouns: z.string().max(50).nullable(),
  bio: z.string().nullable(),
  roleType: z.string().max(50).nullable(),
  createdAt: z.coerce.date(),
});

// ===== REVIEW SCHEDULE SCHEMAS =====

// For review list with user info
export const ReviewScheduleWithUsersSchema = ReviewScheduleSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.string().nullable(),
  }),
  buddy: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.string().nullable(),
  }),
});

// ===== BUDDY CHECK-IN SCHEMAS =====

// For check-in list with user and buddy info
export const BuddyCheckinWithUsersSchema = BuddyCheckinSchema.extend({
  buddy: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.string().nullable(),
  }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.string().nullable(),
  }),
  reviewSchedule: z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    scheduledDate: z.string(),
    status: z.string().nullable(),
  }).nullable(),
});
