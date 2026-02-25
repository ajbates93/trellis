import { db } from "../../../database/connection";
import { reviewSchedules } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const reviewId = getRouterParam(event, "id");

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      message: "Review ID is required",
    });
  }

  try {
    // Get the review
    const [review] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, reviewId))
      .limit(1);

    if (!review) {
      throw createError({
        statusCode: 404,
        message: "Review not found",
      });
    }

    // AUTHORIZATION CHECK: Only buddy or admin can re-open the review
    const isBuddy = review.buddyId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only the buddy or admin can re-open this review",
      });
    }

    // Validate: review must be completed
    if (review.status !== 'completed') {
      throw createError({
        statusCode: 400,
        message: "Only completed reviews can be re-opened",
      });
    }

    // Re-open the review (preserve completionNotes)
    const [updated] = await db
      .update(reviewSchedules)
      .set({
        status: 'scheduled',
        completedDate: null,
      })
      .where(eq(reviewSchedules.id, reviewId))
      .returning();

    return validateResponse(
      { success: true, review: updated },
      apiSchemas.UpdateReviewScheduleResponseSchema
    );
  } catch (error: unknown) {
    console.error("Error re-opening review:", error);
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to re-open review",
    });
  }
});
