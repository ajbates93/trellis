import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { ReviewTemplateField } from "#server/schemas/reviewTemplates";

// Workspaces table (multi-tenancy)
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for workspaces
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(users),
  slackWorkspaces: many(slackWorkspaces),
}));

// Slack Workspaces table (Slack integration)
export const slackWorkspaces = pgTable("slack_workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  slackTeamId: text("slack_team_id").notNull().unique(), // Slack workspace ID
  slackTeamName: text("slack_team_name"),
  accessToken: text("access_token").notNull(), // Bot token (AES-256-GCM encrypted)
  botUserId: text("bot_user_id"), // Bot's Slack user ID
  installedBy: text("installed_by").references(() => users.id),
  installedAt: timestamp("installed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for slack workspaces
export const slackWorkspacesRelations = relations(slackWorkspaces, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [slackWorkspaces.workspaceId],
    references: [workspaces.id],
  }),
  installer: one(users, {
    fields: [slackWorkspaces.installedBy],
    references: [users.id],
  }),
}));

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordEnabled: boolean("password_enabled").default(false),
  name: varchar("name", { length: 255 }).notNull(),
  image: text("image"),
  roleType: varchar("role_type", { length: 50 }),
  buddyId: text("buddy_id"),
  nextReviewDate: date("next_review_date"),
  avatarUrl: text("avatar_url"),
  lastInsightsDate: timestamp("last_insights_date"),
  // Profile fields
  preferredName: varchar("preferred_name", { length: 100 }),
  pronouns: varchar("pronouns", { length: 50 }),
  bio: text("bio"),
  reviewPreference: varchar("review_preference", { length: 20 }), // in-person, remote, hybrid, no-preference
  communicationPreferences: text("communication_preferences"),
  timezone: varchar("timezone", { length: 100 }), // IANA timezone (e.g., Europe/London)
  emailNotificationPreferences: jsonb("email_notification_preferences")
    .$type<Record<string, boolean>>()
    .default({}),
  // Onboarding wizard progress
  onboardingTasks: text("onboarding_tasks").array().default([]),
  // Admin plugin fields
  role: varchar("role", { length: 50 }).default("user"),
  banned: boolean("banned").default(false),
  banReason: varchar("ban_reason", { length: 255 }),
  banExpires: timestamp("ban_expires"),
  // Multi-tenancy fields
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Relations for users
export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [users.workspaceId],
    references: [workspaces.id],
  }),
  buddy: one(users, {
    fields: [users.buddyId],
    references: [users.id],
    relationName: "buddy",
  }),
  buddiesOf: many(users, {
    relationName: "buddy",
  }),
  feedbackGiven: many(feedback, {
    relationName: "reviewer",
  }),
  feedbackReceived: many(feedback, {
    relationName: "reviewee",
  }),
  goals: many(goals),
  goalNotes: many(goalNotes),
  reviewSchedulesAsUser: many(reviewSchedules, {
    relationName: "user",
  }),
  reviewSchedulesAsBuddy: many(reviewSchedules, {
    relationName: "buddy",
  }),
  checkinsAsBuddy: many(buddyCheckins, {
    relationName: "checkinsAsBuddy",
  }),
  checkinsAsUser: many(buddyCheckins, {
    relationName: "checkinsAsUser",
  }),
  onboardingImports: many(onboardingImports),
  feedbackInsights: many(feedbackInsights),
  achievements: many(achievements),
  notifications: many(notifications),
}));

// Feedback table
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  revieweeId: text("reviewee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  weekYear: varchar("week_year", { length: 10 }),
  isRead: boolean("is_read").default(false),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  publishedBy: text("published_by").references(() => users.id),
  isFavourite: boolean("is_favourite").notNull().default(false),
  // reviewScheduleId: uuid("review_schedule_id").references(() => reviewSchedules.id, { onDelete: "set null" }),
});

// Relations for feedback
export const feedbackRelations = relations(feedback, ({ one }) => ({
  reviewer: one(users, {
    fields: [feedback.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  reviewee: one(users, {
    fields: [feedback.revieweeId],
    references: [users.id],
    relationName: "reviewee",
  }),
  // reviewSchedule: one(reviewSchedules, {
  //   fields: [feedback.reviewScheduleId],
  //   references: [reviewSchedules.id],
  // }),
}));

// Goals table
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goalText: text("goal_text").notNull(),
  description: text("description"), // Rich text HTML content from TipTap
  status: varchar("status", { length: 50 }).default("active"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations for goals
export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  notes: many(goalNotes),
  milestones: many(goalMilestones),
}));

// Goal milestones table
export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for goal milestones
export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  goal: one(goals, {
    fields: [goalMilestones.goalId],
    references: [goals.id],
  }),
}));

// Goal notes table
export const goalNotes = pgTable("goal_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for goal notes
export const goalNotesRelations = relations(goalNotes, ({ one }) => ({
  goal: one(goals, {
    fields: [goalNotes.goalId],
    references: [goals.id],
  }),
  author: one(users, {
    fields: [goalNotes.authorId],
    references: [users.id],
  }),
}));

// Review schedules table
export const reviewSchedules = pgTable("review_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  buddyId: text("buddy_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scheduledDate: timestamp("scheduled_date", { mode: "string", withTimezone: true }).notNull(),
  completedDate: timestamp("completed_date", { mode: "string", withTimezone: true }),
  status: varchar("status", { length: 50 }).default("scheduled"),
  notes: text("notes"),
  name: text("name"), // Custom review name, defaults to "Month YYYY"
  completionNotes: text("completion_notes"), // Summary notes after review
  // Reflection fields (filled by reviewee - HTML content from TipTap)
  reflectionLearnings: text("reflection_learnings"), // "What have I learnt in the past three months?"
  reflectionHighlights: text("reflection_highlights"), // "Any highlights?"
  reflectionConcerns: text("reflection_concerns"), // "Are you worried about anything right now?"
  // Buddy comments (filled by buddy - HTML content from TipTap)
  buddyComments: text("buddy_comments"),
  // Reviewee additional comments (filled by reviewee - HTML content from TipTap)
  revieweeComments: text("reviewee_comments"),
  // Review templates (presets)
  templateId: uuid("template_id").references(() => reviewTemplates.id, {
    onDelete: "set null",
  }),
  templateSnapshot: jsonb("template_snapshot").$type<ReviewTemplateField[]>(),
  answers: jsonb("answers").$type<Record<string, string>>().default({}),
  selfScore: integer("self_score"),
  // Email reminder tracking
  reminderSent7d: boolean("reminder_sent_7d").default(false),
  reminderSent1d: boolean("reminder_sent_1d").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for review schedules
export const reviewSchedulesRelations = relations(
  reviewSchedules,
  ({ one, many }) => ({
    user: one(users, {
      fields: [reviewSchedules.userId],
      references: [users.id],
      relationName: "user",
    }),
    buddy: one(users, {
      fields: [reviewSchedules.buddyId],
      references: [users.id],
      relationName: "buddy",
    }),
    feedback: many(feedback),
    checkins: many(buddyCheckins),
    template: one(reviewTemplates, {
      fields: [reviewSchedules.templateId],
      references: [reviewTemplates.id],
    }),
  }),
);

// Review templates (presets) — admin-configurable reflection structures
export const reviewTemplates = pgTable("review_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: text("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  fields: jsonb("fields").$type<ReviewTemplateField[]>().notNull().default([]),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const reviewTemplatesRelations = relations(
  reviewTemplates,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [reviewTemplates.workspaceId],
      references: [workspaces.id],
    }),
    creator: one(users, {
      fields: [reviewTemplates.createdBy],
      references: [users.id],
    }),
    reviews: many(reviewSchedules),
  }),
);

// Onboarding imports table
export const onboardingImports = pgTable("onboarding_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id),
  filename: varchar("filename", { length: 255 }),
  rowsImported: integer("rows_imported"),
  status: varchar("status", { length: 50 }),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for onboarding imports
export const onboardingImportsRelations = relations(
  onboardingImports,
  ({ one }) => ({
    admin: one(users, {
      fields: [onboardingImports.adminId],
      references: [users.id],
    }),
  }),
);

// Feedback prompts table
export const feedbackPrompts = pgTable("feedback_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Buddy check-ins table
// Stores buddy check-in conversations about user progress across all active goals
// Check-ins are per-user (covering all goals) and can be linked to review schedules
export const buddyCheckins = pgTable("buddy_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  buddyId: text("buddy_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  notes: text("notes").notNull(),
  reviewScheduleId: uuid("review_schedule_id").references(() => reviewSchedules.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for buddy check-ins
export const buddyCheckinsRelations = relations(buddyCheckins, ({ one }) => ({
  buddy: one(users, {
    fields: [buddyCheckins.buddyId],
    references: [users.id],
    relationName: "checkinsAsBuddy",
  }),
  user: one(users, {
    fields: [buddyCheckins.userId],
    references: [users.id],
    relationName: "checkinsAsUser",
  }),
  reviewSchedule: one(reviewSchedules, {
    fields: [buddyCheckins.reviewScheduleId],
    references: [reviewSchedules.id],
  }),
}));

// Feedback insights table
// Stores AI-generated sentiment analysis, recurring themes, and goal suggestions
// based on aggregated feedback received by each user. This enables intelligent
// pattern detection using LLMs (e.g., Claude 3.5 Haiku) to identify areas for
// improvement and suggest actionable development goals. Results are cached to
// minimize API costs and improve performance.
export const feedbackInsights = pgTable("feedback_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  analysisDate: timestamp("analysis_date").defaultNow(),
  feedbackCount: integer("feedback_count").notNull(),
  feedbackIds: text("feedback_ids").notNull(), // JSON array of feedback UUIDs
  sentimentData: text("sentiment_data").notNull(), // JSON: {positive: %, constructive: %, neutral: %}
  themes: text("themes").notNull(), // JSON array: [{name, count, sentiment, keywords}]
  suggestedGoals: text("suggested_goals"), // JSON array: [{goalText, basedOnTheme, confidence, dismissed, actedUpon}]
  llmModel: varchar("llm_model", { length: 100 }), // Track which model was used (e.g., claude-3-5-haiku-20250219)
  status: varchar("status", { length: 50 }).default("completed"), // pending, completed, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for feedback insights
export const feedbackInsightsRelations = relations(
  feedbackInsights,
  ({ one }) => ({
    user: one(users, {
      fields: [feedbackInsights.userId],
      references: [users.id],
    }),
  }),
);

// Achievements table (Brag Bucket)
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"), // Rich text HTML content from TipTap
  achievedDate: date("achieved_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for achievements
export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

// Notifications table (in-app event log per recipient)
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Better-auth tables
export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Admin plugin field for impersonation
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Demo requests from the marketing site
export const demoRequests = pgTable("demo_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  teamSize: text("team_size").notNull(),
  message: text("message"),
  source: text("source").notNull().default("homepage"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
