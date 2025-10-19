import { pgTable, uuid, varchar, text, timestamp, date, boolean, integer } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  roleType: varchar('role_type', { length: 50 }),
  buddyId: uuid('buddy_id'),
  nextReviewDate: date('next_review_date'),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revieweeId: uuid('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  weekYear: varchar('week_year', { length: 10 }),
  isRead: boolean('is_read').default(false),
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
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  buddyId: uuid('buddy_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  adminId: uuid('admin_id').notNull().references(() => users.id),
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
