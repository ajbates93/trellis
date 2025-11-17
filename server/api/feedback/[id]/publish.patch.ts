import { db } from "../../../database/connection";
import { feedback, users } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { assignFeedbackToReview } from "../../../utils/reviews";

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
        createdAt: feedback.createdAt,
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

    // Check if already published
    if (feedbackItem.published) {
      throw createError({
        statusCode: 400,
        message: "Feedback is already published",
      });
    }

    // Get the reviewee to check buddy relationship
    const [reviewee] = await db
      .select({ buddyId: users.buddyId })
      .from(users)
      .where(eq(users.id, feedbackItem.revieweeId))
      .limit(1);

    if (!reviewee) {
      throw createError({
        statusCode: 404,
        message: "Reviewee not found",
      });
    }

    // Verify current user is the buddy of the reviewee
    if (reviewee.buddyId !== session.user.id) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to publish this feedback",
      });
    }

    // Publish the feedback
    const [updatedFeedback] = await db
      .update(feedback)
      .set({
        published: true,
        publishedAt: new Date(),
        publishedBy: session.user.id,
      })
      .where(eq(feedback.id, feedbackId))
      .returning();

    // Automatically assign to next review
    if (feedbackItem.createdAt) {
      await assignFeedbackToReview(
        feedbackId,
        feedbackItem.revieweeId,
        feedbackItem.createdAt
      );
    }

    return { success: true, feedback: updatedFeedback };
  } catch (error) {
    console.error("Error publishing feedback:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to publish feedback",
    });
  }
});
