import { pgTable, uuid, varchar, text, timestamp, date, boolean, integer } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: varchar('name', { length: 255 }).notNull(),
  image: text('image'),
  roleType: varchar('role_type', { length: 50 }),
  buddyId: text('buddy_id'),
  nextReviewDate: date('next_review_date'),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

// Relations for users
export const usersRelations = relations(users, ({ one, many }) => ({
  buddy: one(users, {
    fields: [users.buddyId],
    references: [users.id],
    relationName: 'buddy',
  }),
  buddiesOf: many(users, {
    relationName: 'buddy',
  }),
  feedbackGiven: many(feedback, {
    relationName: 'reviewer',
  }),
  feedbackReceived: many(feedback, {
    relationName: 'reviewee',
  }),
  goals: many(goals),
  reviewSchedulesAsUser: many(reviewSchedules, {
    relationName: 'user',
  }),
  reviewSchedulesAsBuddy: many(reviewSchedules, {
    relationName: 'buddy',
  }),
  onboardingImports: many(onboardingImports),
}))

// Feedback table
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewerId: text('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revieweeId: text('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  weekYear: varchar('week_year', { length: 10 }),
  isRead: boolean('is_read').default(false),
  published: boolean('published').default(false),
  publishedAt: timestamp('published_at'),
  publishedBy: text('published_by').references(() => users.id),
})

// Relations for feedback
export const feedbackRelations = relations(feedback, ({ one }) => ({
  reviewer: one(users, {
    fields: [feedback.reviewerId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  reviewee: one(users, {
    fields: [feedback.revieweeId],
    references: [users.id],
    relationName: 'reviewee',
  }),
}))

// Goals table
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goalText: text('goal_text').notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  targetDate: date('target_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

// Relations for goals
export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}))

// Review schedules table
export const reviewSchedules = pgTable('review_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  buddyId: text('buddy_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledDate: date('scheduled_date').notNull(),
  completedDate: date('completed_date'),
  status: varchar('status', { length: 50 }).default('scheduled'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Relations for review schedules
export const reviewSchedulesRelations = relations(reviewSchedules, ({ one }) => ({
  user: one(users, {
    fields: [reviewSchedules.userId],
    references: [users.id],
    relationName: 'user',
  }),
  buddy: one(users, {
    fields: [reviewSchedules.buddyId],
    references: [users.id],
    relationName: 'buddy',
  }),
}))

// Onboarding imports table
export const onboardingImports = pgTable('onboarding_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: text('admin_id').notNull().references(() => users.id),
  filename: varchar('filename', { length: 255 }),
  rowsImported: integer('rows_imported'),
  status: varchar('status', { length: 50 }),
  errorLog: text('error_log'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Relations for onboarding imports
export const onboardingImportsRelations = relations(onboardingImports, ({ one }) => ({
  admin: one(users, {
    fields: [onboardingImports.adminId],
    references: [users.id],
  }),
}))

// Feedback prompts table
export const feedbackPrompts = pgTable('feedback_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// Better-auth tables
export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
