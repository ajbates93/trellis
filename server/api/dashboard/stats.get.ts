import { db } from "#server/database/connection";
import { feedback, users, reviewSchedules } from "#server/database/schema";
import { eq, and, gte, lt, isNotNull } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { computeStreak } from "#server/utils/community-scoring";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Get current user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Calculate date ranges
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfTwoWeeksAgo = new Date(startOfLastWeek);
    startOfTwoWeeksAgo.setDate(startOfTwoWeeksAgo.getDate() - 7);

    // Feedback given this week
    const feedbackGivenThisWeek = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, session.user.id),
          gte(feedback.createdAt, startOfThisWeek)
        )
      );

    // Feedback given last week
    const feedbackGivenLastWeek = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, session.user.id),
          gte(feedback.createdAt, startOfLastWeek),
          lt(feedback.createdAt, startOfThisWeek)
        )
      );

    // Feedback received this week (only published)
    const feedbackReceivedThisWeek = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, session.user.id),
          eq(feedback.published, true),
          gte(feedback.publishedAt, startOfThisWeek)
        )
      );

    // Feedback received last week (only published)
    const feedbackReceivedLastWeek = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, session.user.id),
          eq(feedback.published, true),
          gte(feedback.publishedAt, startOfLastWeek),
          lt(feedback.publishedAt, startOfThisWeek)
        )
      );

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const feedbackGivenCount = feedbackGivenThisWeek.length;
    const feedbackGivenPrevCount = feedbackGivenLastWeek.length;
    const feedbackGivenTrend = calculateTrend(feedbackGivenCount, feedbackGivenPrevCount);

    const feedbackReceivedCount = feedbackReceivedThisWeek.length;
    const feedbackReceivedPrevCount = feedbackReceivedLastWeek.length;
    const feedbackReceivedTrend = calculateTrend(feedbackReceivedCount, feedbackReceivedPrevCount);

    // Calculate days until next review from review_schedules
    let daysUntilReview: number | null = null;

    // Get the next upcoming review for this user
    const upcomingReviews = await db
      .select()
      .from(reviewSchedules)
      .where(
        and(
          eq(reviewSchedules.userId, session.user.id),
          eq(reviewSchedules.status, "scheduled"),
          gte(reviewSchedules.scheduledDate, now.toISOString().split('T')[0])
        )
      )
      .orderBy(reviewSchedules.scheduledDate)
      .limit(1);

    if (upcomingReviews.length > 0 && upcomingReviews[0].scheduledDate) {
      const reviewDate = new Date(upcomingReviews[0].scheduledDate);
      const diffTime = reviewDate.getTime() - now.getTime();
      daysUntilReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Calculate feedback streak using the persisted weekYear column and the
    // shared computeStreak helper (handles ISO year boundaries correctly).
    const weekRows = await db
      .selectDistinct({ weekYear: feedback.weekYear })
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, session.user.id),
          isNotNull(feedback.weekYear),
        ),
      );

    const weekYears = weekRows
      .map((r) => r.weekYear)
      .filter((w): w is string => w !== null);
    const feedbackStreak = computeStreak(weekYears);

    return validateResponse(
      {
        feedbackGiven: feedbackGivenCount,
        feedbackGivenTrend,
        feedbackReceived: feedbackReceivedCount,
        feedbackReceivedTrend,
        daysUntilReview,
        feedbackStreak,
      },
      apiSchemas.GetDashboardStatsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard stats",
    });
  }
});
