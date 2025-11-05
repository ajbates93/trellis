import { db } from "../../../database/connection";
import { feedback } from "../../../database/schema";
import { eq, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

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
    if (feedbackItem.revieweeId !== session.user.id) {
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
      return { success: true, feedback: feedbackItem };
    }

    // Mark as read
    const [updatedFeedback] = await db
      .update(feedback)
      .set({ isRead: true })
      .where(eq(feedback.id, feedbackId))
      .returning();

    return { success: true, feedback: updatedFeedback };
  } catch (error: any) {
    console.error("Error marking feedback as read:", error);
    if (error?.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to mark feedback as read",
    });
  }
});
