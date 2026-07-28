import { db } from "#server/database/connection";
import { users, feedback, goals, reviewSchedules } from "#server/database/schema";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const userId = user.id;

    // Find all users where current user is their buddy
    const buddees = await db
      .select({
        id: users.id,
        name: users.name,
        preferredName: users.preferredName,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.buddyId, userId));

    if (buddees.length === 0) {
      return validateResponse(
        { buddees: [], totalFeedbackToPublish: 0 },
        apiSchemas.GetBuddyDashboardSummaryResponseSchema,
      );
    }

    const buddeeIds = buddees.map((b) => b.id);
    const now = new Date();
    const todayIso = now.toISOString().split("T")[0]!;

    // Aggregate all per-buddee metrics in 4 queries total (not 4 × N).
    const [
      unpublishedRows,
      publishedRows,
      activeGoalsRows,
      upcomingReviewRows,
    ] = await Promise.all([
      // Unpublished feedback count per buddee
      db
        .select({
          revieweeId: feedback.revieweeId,
          count: sql<number>`count(*)::int`,
        })
        .from(feedback)
        .where(
          and(
            inArray(feedback.revieweeId, buddeeIds),
            eq(feedback.published, false),
          ),
        )
        .groupBy(feedback.revieweeId),

      // Published feedback count per buddee
      db
        .select({
          revieweeId: feedback.revieweeId,
          count: sql<number>`count(*)::int`,
        })
        .from(feedback)
        .where(
          and(
            inArray(feedback.revieweeId, buddeeIds),
            eq(feedback.published, true),
          ),
        )
        .groupBy(feedback.revieweeId),

      // Active goals count per buddee
      db
        .select({
          userId: goals.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(goals)
        .where(
          and(inArray(goals.userId, buddeeIds), eq(goals.status, "active")),
        )
        .groupBy(goals.userId),

      // All future scheduled reviews for the buddee set — we'll pick the
      // earliest per buddee in memory below.
      db
        .select({
          userId: reviewSchedules.userId,
          scheduledDate: reviewSchedules.scheduledDate,
        })
        .from(reviewSchedules)
        .where(
          and(
            inArray(reviewSchedules.userId, buddeeIds),
            eq(reviewSchedules.status, "scheduled"),
            gte(reviewSchedules.scheduledDate, todayIso),
          ),
        )
        .orderBy(reviewSchedules.scheduledDate),
    ]);

    // Build lookup maps keyed by buddee id
    const unpublishedByBuddee = new Map<string, number>(
      unpublishedRows.map((r) => [r.revieweeId, r.count]),
    );
    const publishedByBuddee = new Map<string, number>(
      publishedRows.map((r) => [r.revieweeId, r.count]),
    );
    const activeGoalsByBuddee = new Map<string, number>(
      activeGoalsRows.map((r) => [r.userId, r.count]),
    );
    // The rows are already sorted ASC by scheduledDate, so the first entry we
    // see for each buddee is their earliest upcoming review.
    const nextReviewByBuddee = new Map<string, string>();
    for (const row of upcomingReviewRows) {
      if (!row.scheduledDate) continue;
      if (!nextReviewByBuddee.has(row.userId)) {
        nextReviewByBuddee.set(row.userId, row.scheduledDate);
      }
    }

    let totalFeedbackToPublish = 0;

    const buddeesSummary = buddees.map((buddee) => {
      const feedbackToPublish = unpublishedByBuddee.get(buddee.id) ?? 0;
      const feedbackReceived = publishedByBuddee.get(buddee.id) ?? 0;
      const activeGoals = activeGoalsByBuddee.get(buddee.id) ?? 0;

      totalFeedbackToPublish += feedbackToPublish;

      const scheduledDate = nextReviewByBuddee.get(buddee.id) ?? null;
      let nextReviewDate: string | null = null;
      let nextReviewDays: number | null = null;
      if (scheduledDate) {
        nextReviewDate = scheduledDate;
        nextReviewDays = Math.ceil(
          (new Date(scheduledDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      }

      // Determine status
      let status: "on_track" | "needs_attention" | "review_soon" = "on_track";
      if (nextReviewDays !== null && nextReviewDays <= 14) {
        status = "review_soon";
      } else if (feedbackReceived === 0) {
        status = "needs_attention";
      }

      return {
        id: buddee.id,
        name: buddee.name,
        preferredName: buddee.preferredName,
        avatarUrl: buddee.avatarUrl,
        roleType: buddee.roleType,
        feedbackToPublish,
        feedbackReceived,
        activeGoals,
        nextReviewDate,
        nextReviewDays,
        status,
      };
    });

    return validateResponse(
      { buddees: buddeesSummary, totalFeedbackToPublish },
      apiSchemas.GetBuddyDashboardSummaryResponseSchema,
    );
  } catch (error) {
    console.error("Error fetching buddy dashboard summary:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy dashboard summary",
    });
  }
});
