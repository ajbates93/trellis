import { db } from "#server/database/connection";
import { users, feedback, goals } from "#server/database/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  try {
    // Get total users count
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users (emailVerified = true)
    const activeUsersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.emailVerified, true));
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Invited users (emailVerified = false)
    const invitedUsers = totalUsers - activeUsers;

    // Get feedback count for this week
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    const weekFeedbackResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedback)
      .where(gte(feedback.createdAt, weekStart));
    const feedbackThisWeek = weekFeedbackResult[0]?.count || 0;

    // Get total feedback count
    const totalFeedbackResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedback);
    const totalFeedback = totalFeedbackResult[0]?.count || 0;

    // Get active goals count
    const activeGoalsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(goals)
      .where(eq(goals.status, "active"));
    const activeGoals = activeGoalsResult[0]?.count || 0;

    // Get pending reviews count (users with upcoming review dates)
    const pendingReviewsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.nextReviewDate} IS NOT NULL AND ${users.nextReviewDate} >= CURRENT_DATE`);
    const pendingReviews = pendingReviewsResult[0]?.count || 0;

    return validateResponse(
      {
        totalUsers,
        activeUsers,
        invitedUsers,
        feedbackThisWeek,
        totalFeedback,
        activeGoals,
        pendingReviews,
      },
      apiSchemas.GetAdminStatsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch admin statistics",
    });
  }
});
