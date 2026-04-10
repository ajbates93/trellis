import { db } from "../../database/connection";
import { users, feedback, goals, reviewSchedules } from "../../database/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const userId = session.user.id;

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

    const now = new Date();
    let totalFeedbackToPublish = 0;

    const buddeesSummary = await Promise.all(
      buddees.map(async (buddee) => {
        // Unpublished feedback for this buddee
        const [unpublished] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(feedback)
          .where(
            and(
              eq(feedback.revieweeId, buddee.id),
              eq(feedback.published, false),
            ),
          );

        // Published feedback received (total)
        const [published] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(feedback)
          .where(
            and(
              eq(feedback.revieweeId, buddee.id),
              eq(feedback.published, true),
            ),
          );

        // Active goals count
        const [goalsCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(goals)
          .where(
            and(eq(goals.userId, buddee.id), eq(goals.status, "active")),
          );

        // Next scheduled review
        const nextReview = await db
          .select({ scheduledDate: reviewSchedules.scheduledDate })
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, buddee.id),
              eq(reviewSchedules.status, "scheduled"),
              gte(reviewSchedules.scheduledDate, now.toISOString().split("T")[0]),
            ),
          )
          .orderBy(reviewSchedules.scheduledDate)
          .limit(1);

        const feedbackToPublish = unpublished.count;
        totalFeedbackToPublish += feedbackToPublish;

        let nextReviewDate: string | null = null;
        let nextReviewDays: number | null = null;
        if (nextReview.length > 0 && nextReview[0].scheduledDate) {
          const reviewDate = new Date(nextReview[0].scheduledDate);
          nextReviewDate = nextReview[0].scheduledDate;
          nextReviewDays = Math.ceil(
            (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
        }

        // Determine status
        let status: "on_track" | "needs_attention" | "review_soon" = "on_track";
        if (nextReviewDays !== null && nextReviewDays <= 14) {
          status = "review_soon";
        } else if (published.count === 0) {
          status = "needs_attention";
        }

        return {
          id: buddee.id,
          name: buddee.name,
          preferredName: buddee.preferredName,
          avatarUrl: buddee.avatarUrl,
          roleType: buddee.roleType,
          feedbackToPublish,
          feedbackReceived: published.count,
          activeGoals: goalsCount.count,
          nextReviewDate,
          nextReviewDays,
          status,
        };
      }),
    );

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
