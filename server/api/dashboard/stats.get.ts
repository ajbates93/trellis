import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";

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

    // Calculate days until next review
    let daysUntilReview: number | null = null;
    if (user.nextReviewDate) {
      const reviewDate = new Date(user.nextReviewDate);
      const diffTime = reviewDate.getTime() - now.getTime();
      daysUntilReview = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      feedbackGiven: feedbackGivenCount,
      feedbackGivenTrend,
      feedbackReceived: feedbackReceivedCount,
      feedbackReceivedTrend,
      daysUntilReview,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard stats",
    });
  }
});
