import { db } from "#server/database/connection";
import { reviewSchedules } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertSameWorkspace } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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
    const isBuddy = review.buddyId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only the buddy or admin can re-open this review",
      });
    }

    // An admin re-opening someone else's review may only do so within their
    // own workspace.
    if (isAdmin && !isBuddy) {
      await assertSameWorkspace(event, review.userId);
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
