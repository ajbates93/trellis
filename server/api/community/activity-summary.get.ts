import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { sql, eq, and, gte, lt } from "drizzle-orm";
import { startOfISOWeek, subWeeks } from "date-fns";
import { validateResponse } from "../../utils/validation";
import { getWorkspaceId } from "../../utils/workspace";
import { computeStreak } from "../../utils/community-scoring";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const workspaceId = getWorkspaceId(event);

  try {
    // Current ISO week start and last week start
    const weekStart = startOfISOWeek(new Date());
    const lastWeekStart = subWeeks(weekStart, 1);

    // Total feedback this week
    const [weekResult] = await db
      .select({
        count: sql<number>`count(${feedback.id})::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          gte(feedback.createdAt, weekStart),
        ),
      );

    // Active contributors this week (distinct reviewers)
    const [contributorResult] = await db
      .select({
        count: sql<number>`count(distinct ${feedback.reviewerId})::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          gte(feedback.createdAt, weekStart),
        ),
      );

    // Last week's feedback count
    const [lastWeekResult] = await db
      .select({
        count: sql<number>`count(${feedback.id})::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          gte(feedback.createdAt, lastWeekStart),
          lt(feedback.createdAt, weekStart),
        ),
      );

    // Total workspace users (verified/active)
    const [userCountResult] = await db
      .select({
        count: sql<number>`count(${users.id})::int`,
      })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          eq(users.emailVerified, true),
        ),
      );

    // Find longest active streak across all users
    // Get all feedback with weekYear for workspace users
    const allFeedback = await db
      .select({
        reviewerId: feedback.reviewerId,
        weekYear: feedback.weekYear,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(eq(users.workspaceId, workspaceId));

    // Group by user and compute streaks
    const userWeeks = new Map<string, string[]>();
    for (const f of allFeedback) {
      if (f.weekYear) {
        const weeks = userWeeks.get(f.reviewerId) || [];
        weeks.push(f.weekYear);
        userWeeks.set(f.reviewerId, weeks);
      }
    }

    let longestStreak = 0;
    let streakHolderId: string | null = null;
    for (const [userId, weeks] of userWeeks) {
      const streak = computeStreak(weeks);
      if (streak > longestStreak) {
        longestStreak = streak;
        streakHolderId = userId;
      }
    }

    // Get streak holder info
    let streakHolder: { name: string; avatarUrl: string | null } | null = null;
    if (streakHolderId) {
      const [holder] = await db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, streakHolderId));
      if (holder) {
        streakHolder = holder;
      }
    }

    const totalFeedbackThisWeek = weekResult?.count ?? 0;
    const activeContributors = contributorResult?.count ?? 0;
    const lastWeekFeedbackCount = lastWeekResult?.count ?? 0;
    const weekOverWeekChange = totalFeedbackThisWeek - lastWeekFeedbackCount;
    const avgFeedbackPerContributor =
      activeContributors > 0
        ? Math.round((totalFeedbackThisWeek / activeContributors) * 10) / 10
        : 0;

    return validateResponse(
      {
        totalFeedbackThisWeek,
        activeContributors,
        longestActiveStreak: longestStreak,
        streakHolder,
        totalWorkspaceUsers: userCountResult?.count ?? 0,
        lastWeekFeedbackCount,
        weekOverWeekChange,
        avgFeedbackPerContributor,
      },
      apiSchemas.GetActivitySummaryResponseSchema,
    );
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error("Error computing activity summary:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to compute activity summary",
    });
  }
});
