import { db } from "#server/database/connection";
import { achievements, reviewSchedules } from "#server/database/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const reviewId = getRouterParam(event, "reviewId");

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      message: "Review ID is required",
    });
  }

  try {
    // Get the review to verify ownership and get the date range
    const review = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, reviewId));

    if (!review || review.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Review not found",
      });
    }

    const currentReview = review[0]!;

    // Verify the user is either the reviewer or the reviewee
    if (currentReview.userId !== user.id && currentReview.buddyId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "Not authorized to view achievements for this review",
      });
    }

    // Get previous review's completion date to determine start range
    const previousReviews = await db
      .select()
      .from(reviewSchedules)
      .where(
        and(
          eq(reviewSchedules.userId, currentReview.userId),
          lte(reviewSchedules.scheduledDate, currentReview.scheduledDate)
        )
      )
      .orderBy((fields) => desc(fields.scheduledDate));

    // Find the previous review for this user
    let startDate = new Date(0); // Beginning of time
    if (previousReviews.length > 1) {
      const previousReview = previousReviews[1];
      if (previousReview) {
        startDate = new Date(previousReview.scheduledDate);
      }
    } else if (previousReviews.length === 1) {
      // For the first review, start from the beginning of time to catch all previous achievements
      startDate = new Date(0);
    }

    // Get all achievements for this user
    const allAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, currentReview!.userId))
      .orderBy((fields) => desc(fields.achievedDate));

    // Filter by date range in JavaScript
    const startDateStr = startDate.toISOString().split('T')[0]!;
    const endDateStr = currentReview!.scheduledDate;

    const reviewAchievements = allAchievements.filter((a) => {
      return a.achievedDate >= startDateStr && a.achievedDate <= endDateStr;
    });

    return validateResponse(
      { achievements: reviewAchievements },
      apiSchemas.GetAchievementsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching achievements for review:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch achievements for review",
    });
  }
});
