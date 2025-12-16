import { db } from "../../../database/connection";
import { feedback } from "../../../database/schema";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  // Get session/user from better-auth
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const userId = getRouterParam(event, "userId");

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  // Calculate current week-year format
  const now = new Date();
  const currentWeekYear = format(now, "RRRR-'W'II");

  try {
    // Check if already reviewed this user this week
    const existingFeedback = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, session.user.id),
          eq(feedback.revieweeId, userId),
          eq(feedback.weekYear, currentWeekYear)
        )
      )
      .limit(1);

    const alreadyReviewed = existingFeedback.length > 0;

    return validateResponse(
      {
        canReview: true, // Always allow, but warn if already reviewed
        alreadyReviewedThisWeek: alreadyReviewed,
        message: alreadyReviewed
          ? "You've already given feedback to this person this week"
          : "You can give feedback to this person",
      },
      apiSchemas.CanReviewResponseSchema
    );
  } catch (error) {
    console.error("Failed to check review status:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to check review status",
    });
  }
});
