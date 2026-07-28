import { db } from "#server/database/connection";
import { feedback } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const feedbackId = getRouterParam(event, "id");

  if (!feedbackId) {
    throw createError({
      statusCode: 400,
      message: "Feedback ID is required",
    });
  }

  try {
    // Get the feedback item
    const [feedbackItem] = await db
      .select({
        id: feedback.id,
        revieweeId: feedback.revieweeId,
        published: feedback.published,
        isRead: feedback.isRead,
      })
      .from(feedback)
      .where(eq(feedback.id, feedbackId))
      .limit(1);

    if (!feedbackItem) {
      throw createError({
        statusCode: 404,
        message: "Feedback not found",
      });
    }

    // Verify current user is the reviewee
    if (feedbackItem.revieweeId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only mark your own feedback as read",
      });
    }

    // Check if feedback is published
    if (!feedbackItem.published) {
      throw createError({
        statusCode: 403,
        message: "Cannot mark unpublished feedback as read",
      });
    }

    // Already read, no need to update
    if (feedbackItem.isRead) {
      return validateResponse({ success: true, feedback: feedbackItem }, apiSchemas.SuccessResponseSchema);
    }

    // Mark as read
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ isRead: true })
      .where(eq(feedback.id, feedbackId))
      .returning();

    const response = { success: true, feedback: updatedFeedback };
    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    console.error("Error marking feedback as read:", error);
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to mark feedback as read",
    });
  }
});
