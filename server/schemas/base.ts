import { z } from 'zod';

// Users table schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  passwordEnabled: z.boolean().nullable(),
  name: z.string().min(1).max(255),
  image: z.string().nullable(),
  roleType: z.string().max(50).nullable(),
  buddyId: z.string().nullable(),
  nextReviewDate: z.string().nullable(), // ISO date string
  avatarUrl: z.string().nullable(),
  preferredName: z.string().max(100).nullable(),
  pronouns: z.string().max(50).nullable(),
  bio: z.string().nullable(),
  reviewPreference: z.string().max(20).nullable(),
  communicationPreferences: z.string().nullable(),
  onboardingTasks: z.array(z.string()).default([]),
  role: z.string().max(50).nullable(),
  banned: z.boolean().default(false),
  banReason: z.string().max(255).nullable(),
  banExpires: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastInsightsDate: z.coerce.date().nullable(),
});

// Feedback table schema
export const FeedbackSchema = z.object({
  id: z.uuid(),
  reviewerId: z.string(),
  revieweeId: z.string(),
  content: z.string().min(1),
  createdAt: z.coerce.date().nullable(),
  weekYear: z.string().max(10).nullable(),
  isRead: z.boolean().nullable(),
  published: z.boolean().nullable(),
  publishedAt: z.coerce.date().nullable(),
  publishedBy: z.string().nullable(),
  reviewScheduleId: z.uuid().nullable(),
});

// Goals table schema
export const GoalSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  goalText: z.string().min(1),
  description: z.string().nullable(),
  status: z.string().max(50).nullable(),
  targetDate: z.string().nullable(), // ISO date string
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
});

// Goal milestones table schema
export const GoalMilestoneSchema = z.object({
  id: z.uuid(),
  goalId: z.uuid(),
  title: z.string().min(1),
  isCompleted: z.boolean().nullable(),
  completedAt: z.coerce.date().nullable(),
  displayOrder: z.int().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Goal notes table schema
export const GoalNoteSchema = z.object({
  id: z.uuid(),
  goalId: z.uuid(),
  authorId: z.string(),
  noteText: z.string().min(1),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Review schedules table schema
export const ReviewScheduleSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  buddyId: z.string(),
  scheduledDate: z.string(), // ISO date string
  completedDate: z.string().nullable(),
  status: z.string().max(50).nullable(),
  notes: z.string().nullable(),
  name: z.string().nullable(),
  completionNotes: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Onboarding imports table schema
export const OnboardingImportSchema = z.object({
  id: z.uuid(),
  adminId: z.string(),
  filename: z.string().max(255).nullable(),
  rowsImported: z.int().nullable(),
  status: z.string().max(50).nullable(),
  errorLog: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
});

// Feedback prompts table schema
export const FeedbackPromptSchema = z.object({
  id: z.uuid(),
  question: z.string().min(1),
  category: z.string().max(50).nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().nullable(),
});

// Buddy check-ins table schema
export const BuddyCheckinSchema = z.object({
  id: z.uuid(),
  buddyId: z.string(),
  userId: z.string(),
  notes: z.string().min(1),
  reviewScheduleId: z.uuid().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Feedback insights table schema
export const FeedbackInsightSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  analysisDate: z.coerce.date().nullable(),
  feedbackCount: z.int(),
  feedbackIds: z.string(), // JSON array string
  sentimentData: z.string(), // JSON string
  themes: z.string(), // JSON array string
  suggestedGoals: z.string().nullable(), // JSON array string
  llmModel: z.string().max(100).nullable(),
  status: z.string().max(50).nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Achievements table schema
export const AchievementSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
  achievedDate: z.string(), // ISO date string
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Sessions table schema (Better-auth)
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  impersonatedBy: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Accounts table schema (Better-auth)
export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

// Verifications table schema (Better-auth)
export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});
