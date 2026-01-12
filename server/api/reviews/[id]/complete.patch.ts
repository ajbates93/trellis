import { db } from "../../../database/connection";
import { reviewSchedules } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { validateBody, validateResponse } from "../../../utils/validation";
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

  const body = await validateBody(event, apiSchemas.CompleteReviewRequestSchema);
  const { completionNotes } = body;

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

    // AUTHORIZATION CHECK: Only buddy or admin can complete the review
    const isBuddy = review.buddyId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only the buddy or admin can complete this review",
      });
    }

    // Update review to completed
    // Store current datetime in UTC
    const now = new Date();
    const completedDateUTC = now.toISOString();

    const [updated] = await db
      .update(reviewSchedules)
      .set({
        status: 'completed',
        completedDate: completedDateUTC,
        completionNotes: completionNotes || null,
      })
      .where(eq(reviewSchedules.id, reviewId))
      .returning();

    return validateResponse(
      { success: true, review: updated },
      apiSchemas.UpdateReviewScheduleResponseSchema
    );
  } catch (error: unknown) {
    console.error("Error completing review:", error);
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to complete review",
    });
  }
});
