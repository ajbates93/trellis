import { z } from 'zod';
import { GoalMilestoneSchema } from './base';
import {
  GoalWithMilestonesSchema,
  FeedbackWithReviewerSchema,
  FeedbackWithRevieweeSchema,
  UserWithBuddySchema,
  UserPublicSchema,
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

export const GetUnreadCountResponseSchema = z.object({
  count: z.int().nonnegative(),
});

export const CanReviewResponseSchema = z.object({
  canReview: z.boolean(),
  alreadyReviewedThisWeek: z.boolean(),
  message: z.string(),
});

export const AssignReviewRequestSchema = z.object({
  reviewScheduleId: z.string().uuid().nullable(),
});

export const GetBuddyGivenFeedbackResponseSchema = z.object({
  feedback: z.array(FeedbackWithRevieweeSchema.extend({
    review: z.object({
      id: z.uuid(),
      name: z.string().nullable(),
      scheduledDate: z.string(),
    }).nullable(),
  })),
});

export const GetBuddyReceivedFeedbackResponseSchema = z.object({
  feedback: z.array(FeedbackWithReviewerSchema.extend({
    review: z.object({
      id: z.uuid(),
      name: z.string().nullable(),
      scheduledDate: z.string(),
    }).nullable(),
  })),
});

export const GetForBuddyResponseSchema = z.object({
  buddyAssignments: z.array(z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    }),
    pendingCount: z.int().nonnegative(),
    feedback: z.array(z.object({
      id: z.uuid(),
      content: z.string(),
      createdAt: z.coerce.date().nullable(),
      revieweeId: z.string(),
      reviewScheduleId: z.uuid().nullable(),
      reviewer: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullable(),
        avatarUrl: z.string().nullable(),
      }),
      review: z.object({
        id: z.uuid(),
        name: z.string().nullable(),
        scheduledDate: z.string(),
      }).nullable(),
    })),
  })),
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

export const GetBuddyGoalsResponseSchema = z.object({
  buddyAssignments: z.array(z.object({
    user: UserPublicSchema,
    goals: z.array(GoalWithMilestonesSchema),
  })),
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
  userId: z.string().min(1, 'User ID is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  name: z.string().optional(),
  notes: z.string().nullable().optional(),
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

export const UpdateReviewScheduleResponseSchema = z.object({
  success: z.boolean(),
  review: z.object({
    id: z.uuid(),
    userId: z.string(),
    buddyId: z.string(),
    scheduledDate: z.string(),
    status: z.string().nullable(),
    name: z.string().nullable(),
    notes: z.string().nullable(),
    completionNotes: z.string().nullable(),
    completedDate: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
});

export const GetReviewDetailsResponseSchema = z.object({
  review: z.object({
    id: z.uuid(),
    userId: z.string(),
    buddyId: z.string(),
    scheduledDate: z.string(),
    completedDate: z.string().nullable(),
    status: z.string().nullable(),
    name: z.string().nullable(),
    notes: z.string().nullable(),
    completionNotes: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      roleType: z.string().nullable(),
    }),
    buddy: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      roleType: z.string().nullable(),
    }),
  }),
  feedback: z.array(z.object({
    id: z.uuid(),
    content: z.string(),
    createdAt: z.coerce.date().nullable(),
    publishedAt: z.coerce.date().nullable(),
    isRead: z.boolean().nullable(),
    reviewer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  })),
  goals: z.array(z.object({
    id: z.uuid(),
    goalText: z.string(),
    status: z.string().nullable(),
    targetDate: z.string().nullable(),
    createdAt: z.coerce.date(),
  })),
  feedbackCount: z.int().nonnegative(),
});

export const GetReviewsWithDetailsResponseSchema = z.object({
  reviews: z.array(z.object({
    id: z.uuid(),
    userId: z.string(),
    buddyId: z.string(),
    scheduledDate: z.string(),
    completedDate: z.string().nullable(),
    status: z.string().nullable(),
    name: z.string().nullable(),
    notes: z.string().nullable(),
    completionNotes: z.string().nullable().optional(),
    createdAt: z.coerce.date(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      roleType: z.string().nullable(),
    }),
    buddy: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      roleType: z.string().nullable(),
    }),
    feedbackCount: z.int().nonnegative(),
    checkins: z.array(z.object({
      id: z.uuid(),
      buddy: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        avatarUrl: z.string().nullable(),
      }),
      notes: z.string(),
      createdAt: z.coerce.date(),
    })),
  })),
});

export const CompleteReviewRequestSchema = z.object({
  completionNotes: z.string().nullable().optional(),
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

export const GetBuddyCheckinsArrayResponseSchema = z.array(BuddyCheckinWithUsersSchema);

export const CreateBuddyCheckinResponseSchema = z.object({
  success: z.boolean(),
  checkin: BuddyCheckinWithUsersSchema,
});

export const UpdateBuddyCheckinRequestSchema = z.object({
  notes: z.string()
    .min(10, 'Check-in notes must be at least 10 characters')
    .max(5000, 'Check-in notes must be less than 5000 characters')
    .optional(),
  reviewScheduleId: z.uuid().optional().nullable(),
});

// ===== USER PROFILE SCHEMAS =====

export const GetMyBuddiesResponseSchema = z.object({
  buddies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
    roleType: z.string().nullable(),
  })),
});

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  roleType: z.enum(['dev', 'design', 'qa']).optional().nullable(),
  avatarUrl: z.string().url().nullable().optional(),
});

// ===== GOAL NOTES SCHEMAS =====

export const GetGoalNotesResponseSchema = z.object({
  notes: z.array(z.object({
    id: z.uuid(),
    goalId: z.uuid(),
    authorId: z.string(),
    noteText: z.string(),
    createdAt: z.date(),
    author: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    }),
  })),
});

export const CreateGoalNoteRequestSchema = z.object({
  noteText: z.string()
    .min(1, 'Note content is required')
    .max(2000, 'Note content must be less than 2000 characters'),
});

export const CreateGoalNoteResponseSchema = z.object({
  success: z.boolean(),
  note: z.object({
    id: z.uuid(),
    goalId: z.uuid(),
    authorId: z.string(),
    noteText: z.string(),
    createdAt: z.date(),
  }),
});

// ===== ADMIN ANALYTICS SCHEMAS =====

export const GetAdminStatsResponseSchema = z.object({
  totalUsers: z.int().nonnegative(),
  activeUsers: z.int().nonnegative(),
  totalFeedback: z.int().nonnegative(),
  totalGoals: z.int().nonnegative(),
  feedbackThisWeek: z.int().nonnegative(),
  feedbackThisMonth: z.int().nonnegative(),
}).passthrough(); // Allow additional fields

export const GetEngagementResponseSchema = z.object({
  weeklyActivity: z.array(z.object({
    week: z.string(),
    feedbackCount: z.int().nonnegative(),
    activeUsers: z.int().nonnegative(),
  })),
  topContributors: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
    feedbackGiven: z.int().nonnegative(),
    feedbackReceived: z.int().nonnegative(),
  })),
}).passthrough(); // Allow additional fields

// ===== GENERIC RESPONSE SCHEMAS =====

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export const ErrorResponseSchema = z.object({
  statusCode: z.int(),
  message: z.string(),
  data: z.any().optional(),
});

// ===== ADMIN ANALYTICS RESPONSE SCHEMAS =====

export const GetRecentActivityResponseSchema = z.object({
  activity: z.array(z.object({
    id: z.uuid(),
    type: z.string(),
    content: z.string(),
    createdAt: z.coerce.date().nullable(),
    metadata: z.object({
      reviewerName: z.string().optional(),
      revieweeName: z.string().optional(),
      published: z.boolean().optional(),
      userName: z.string().optional(),
      status: z.string().nullable().optional(),
    }),
  })),
});

export const GetTopContributorsResponseSchema = z.object({
  contributors: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
    image: z.string().nullable(),
    roleType: z.string().nullable(),
    feedbackCount: z.int().nonnegative(),
  })),
});

export const GetFeedbackDistributionResponseSchema = z.record(z.int().nonnegative());

export const GetOnboardingHistoryResponseSchema = z.object({
  imports: z.array(z.object({
    id: z.uuid(),
    filename: z.string(),
    rowsImported: z.int().nonnegative(),
    status: z.string().nullable(),
    errorLog: z.string().nullable(),
    createdAt: z.coerce.date(),
    adminName: z.string(),
    adminEmail: z.string(),
  })),
});

// ===== INSIGHTS RESPONSE SCHEMAS =====

export const GetUserInsightsSummaryResponseSchema = z.object({
  hasAnalysis: z.boolean(),
  userName: z.string().optional(),
  lastAnalyzed: z.coerce.date().nullable().optional(),
  feedbackCount: z.int().nonnegative().optional(),
  newFeedbackSinceAnalysis: z.int().nonnegative().optional(),
  message: z.string().optional(),
  data: z.object({
    sentimentData: z.any(),
    themes: z.any(),
    suggestedGoals: z.array(z.any()),
  }).nullable(),
});

export const AnalyzeInsightsResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  userName: z.string().optional(),
  lastAnalyzed: z.coerce.date().nullable().optional(),
  data: z.object({
    sentimentData: z.any(),
    themes: z.any(),
    suggestedGoals: z.array(z.any()),
    feedbackCount: z.int().nonnegative().optional(),
  }).optional(),
});

export const GetTeamSentimentSummaryResponseSchema = z.object({
  totalUsers: z.int().nonnegative(),
  usersWithAnalysis: z.int().nonnegative(),
  usersWithoutAnalysis: z.int().nonnegative(),
  aggregateSentiment: z.object({
    positive: z.int().nonnegative(),
    constructive: z.int().nonnegative(),
    neutral: z.int().nonnegative(),
  }).nullable(),
  users: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    avatarUrl: z.string().nullable(),
    roleType: z.string().nullable(),
    currentSentiment: z.object({
      positive: z.int().nonnegative(),
      constructive: z.int().nonnegative(),
      neutral: z.int().nonnegative(),
    }).nullable(),
    dominantSentiment: z.enum(['positive', 'constructive', 'neutral', 'none']),
    trend: z.enum(['improving', 'declining', 'stable', 'new']),
    lastAnalyzed: z.coerce.date().nullable(),
    feedbackCount: z.int().nonnegative(),
  })),
});

// ===== ACHIEVEMENTS RESPONSE SCHEMAS =====

export const GetAchievementsResponseSchema = z.object({
  achievements: z.array(z.object({
    id: z.uuid(),
    userId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    achievedDate: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })),
});

export const CreateAchievementRequestSchema = z.object({
  title: z.string().min(5, 'Achievement title must be at least 5 characters').max(255, 'Achievement title must be less than 255 characters'),
  description: z.string().nullable().optional(),
  achievedDate: z.string().min(1, 'Achievement date is required'),
});

export const CreateAchievementResponseSchema = z.object({
  achievement: z.object({
    id: z.uuid(),
    userId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    achievedDate: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
});

export const UpdateAchievementRequestSchema = z.object({
  title: z.string().min(5, 'Achievement title must be at least 5 characters').max(255, 'Achievement title must be less than 255 characters').optional(),
  description: z.string().nullable().optional(),
  achievedDate: z.string().optional(),
});

export const UpdateAchievementResponseSchema = z.object({
  achievement: z.object({
    id: z.uuid(),
    userId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    achievedDate: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
});

// ===== ANALYTICS RESPONSE SCHEMAS =====

export const GetFeedbackTimelineResponseSchema = z.object({
  timeline: z.array(z.object({
    date: z.coerce.date(),
    given: z.int().nonnegative(),
    received: z.int().nonnegative(),
  })),
});

export const GetDashboardStatsResponseSchema = z.object({
  feedbackGiven: z.int().nonnegative(),
  feedbackGivenTrend: z.int(),
  feedbackReceived: z.int().nonnegative(),
  feedbackReceivedTrend: z.int(),
  daysUntilReview: z.int().nonnegative().nullable(),
});

// ===== FEEDBACK PROMPTS RESPONSE SCHEMAS =====

export const GetRandomFeedbackPromptResponseSchema = z.object({
  prompt: z.object({
    id: z.uuid(),
    question: z.string(),
    category: z.string().nullable(),
  }),
});

// ===== USERS RESPONSE SCHEMAS =====

export const GetAllUsersResponseSchema = z.object({
  users: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    roleType: z.string().nullable(),
  })),
});
