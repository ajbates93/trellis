import type { z } from 'zod';
import * as baseSchemas from '../schemas/base';
import * as computedSchemas from '../schemas/computed';
import * as apiSchemas from '../schemas/api';

// ===== BASE TYPES (inferred from Zod schemas) =====

export type User = z.infer<typeof baseSchemas.UserSchema>;
export type Feedback = z.infer<typeof baseSchemas.FeedbackSchema>;
export type Goal = z.infer<typeof baseSchemas.GoalSchema>;
export type GoalMilestone = z.infer<typeof baseSchemas.GoalMilestoneSchema>;
export type GoalNote = z.infer<typeof baseSchemas.GoalNoteSchema>;
export type ReviewSchedule = z.infer<typeof baseSchemas.ReviewScheduleSchema>;
export type OnboardingImport = z.infer<typeof baseSchemas.OnboardingImportSchema>;
export type FeedbackPrompt = z.infer<typeof baseSchemas.FeedbackPromptSchema>;
export type BuddyCheckin = z.infer<typeof baseSchemas.BuddyCheckinSchema>;
export type FeedbackInsight = z.infer<typeof baseSchemas.FeedbackInsightSchema>;
export type Achievement = z.infer<typeof baseSchemas.AchievementSchema>;
export type Session = z.infer<typeof baseSchemas.SessionSchema>;
export type Account = z.infer<typeof baseSchemas.AccountSchema>;
export type Verification = z.infer<typeof baseSchemas.VerificationSchema>;

// ===== COMPUTED TYPES (joined/enhanced types) =====

export type FeedbackWithReviewer = z.infer<typeof computedSchemas.FeedbackWithReviewerSchema>;
export type FeedbackWithReviewee = z.infer<typeof computedSchemas.FeedbackWithRevieweeSchema>;
export type GoalWithMilestones = z.infer<typeof computedSchemas.GoalWithMilestonesSchema>;
export type UserWithBuddy = z.infer<typeof computedSchemas.UserWithBuddySchema>;
export type UserPublic = z.infer<typeof computedSchemas.UserPublicSchema>;
export type ReviewScheduleWithUsers = z.infer<typeof computedSchemas.ReviewScheduleWithUsersSchema>;
export type BuddyCheckinWithUsers = z.infer<typeof computedSchemas.BuddyCheckinWithUsersSchema>;

// ===== API REQUEST TYPES =====

export type CreateFeedbackRequest = z.infer<typeof apiSchemas.CreateFeedbackRequestSchema>;
export type MarkFeedbackAsReadRequest = z.infer<typeof apiSchemas.MarkFeedbackAsReadRequestSchema>;
export type PublishFeedbackRequest = z.infer<typeof apiSchemas.PublishFeedbackRequestSchema>;
export type PublishBatchFeedbackRequest = z.infer<typeof apiSchemas.PublishBatchFeedbackRequestSchema>;

export type CreateGoalRequest = z.infer<typeof apiSchemas.CreateGoalRequestSchema>;
export type UpdateGoalRequest = z.infer<typeof apiSchemas.UpdateGoalRequestSchema>;
export type UpdateGoalStatusRequest = z.infer<typeof apiSchemas.UpdateGoalStatusRequestSchema>;

export type CreateMilestoneRequest = z.infer<typeof apiSchemas.CreateMilestoneRequestSchema>;
export type UpdateMilestoneRequest = z.infer<typeof apiSchemas.UpdateMilestoneRequestSchema>;
export type ReorderMilestonesRequest = z.infer<typeof apiSchemas.ReorderMilestonesRequestSchema>;

export type CreateUserRequest = z.infer<typeof apiSchemas.CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof apiSchemas.UpdateUserRequestSchema>;

export type OnboardingImportRequest = z.infer<typeof apiSchemas.OnboardingImportRequestSchema>;
export type CSVRow = z.infer<typeof apiSchemas.CSVRowSchema>;

export type CreateReviewScheduleRequest = z.infer<typeof apiSchemas.CreateReviewScheduleRequestSchema>;
export type UpdateReviewScheduleRequest = z.infer<typeof apiSchemas.UpdateReviewScheduleRequestSchema>;

export type CreateBuddyCheckinRequest = z.infer<typeof apiSchemas.CreateBuddyCheckinRequestSchema>;

// ===== API RESPONSE TYPES =====

export type CreateFeedbackResponse = z.infer<typeof apiSchemas.CreateFeedbackResponseSchema>;
export type GetReceivedFeedbackResponse = z.infer<typeof apiSchemas.GetReceivedFeedbackResponseSchema>;
export type GetGivenFeedbackResponse = z.infer<typeof apiSchemas.GetGivenFeedbackResponseSchema>;
export type GetReceivedCountResponse = z.infer<typeof apiSchemas.GetReceivedCountResponseSchema>;

export type GetGoalsResponse = z.infer<typeof apiSchemas.GetGoalsResponseSchema>;
export type GetBuddyGoalsResponse = z.infer<typeof apiSchemas.GetBuddyGoalsResponseSchema>;
export type CreateGoalResponse = z.infer<typeof apiSchemas.CreateGoalResponseSchema>;
export type UpdateGoalResponse = z.infer<typeof apiSchemas.UpdateGoalResponseSchema>;

export type CreateMilestoneResponse = z.infer<typeof apiSchemas.CreateMilestoneResponseSchema>;
export type UpdateMilestoneResponse = z.infer<typeof apiSchemas.UpdateMilestoneResponseSchema>;

export type GetUsersResponse = z.infer<typeof apiSchemas.GetUsersResponseSchema>;
export type CreateUserResponse = z.infer<typeof apiSchemas.CreateUserResponseSchema>;
export type UpdateUserResponse = z.infer<typeof apiSchemas.UpdateUserResponseSchema>;

export type OnboardingImportResponse = z.infer<typeof apiSchemas.OnboardingImportResponseSchema>;

export type GetReviewSchedulesResponse = z.infer<typeof apiSchemas.GetReviewSchedulesResponseSchema>;
export type CreateReviewScheduleResponse = z.infer<typeof apiSchemas.CreateReviewScheduleResponseSchema>;

export type GetBuddyCheckinsResponse = z.infer<typeof apiSchemas.GetBuddyCheckinsResponseSchema>;
export type GetBuddyCheckinsArrayResponse = z.infer<typeof apiSchemas.GetBuddyCheckinsArrayResponseSchema>;
export type CreateBuddyCheckinResponse = z.infer<typeof apiSchemas.CreateBuddyCheckinResponseSchema>;

export type GetDashboardStatsResponse = z.infer<typeof apiSchemas.GetDashboardStatsResponseSchema>;
export type GetDashboardActivityResponse = z.infer<typeof apiSchemas.GetDashboardActivityResponseSchema>;
export type GetFeedbackPulseResponse = z.infer<typeof apiSchemas.GetFeedbackPulseResponseSchema>;

export type SuccessResponse = z.infer<typeof apiSchemas.SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof apiSchemas.ErrorResponseSchema>;

// ===== SCHEMA EXPORTS (for validation in endpoints) =====

export { baseSchemas, computedSchemas, apiSchemas };
