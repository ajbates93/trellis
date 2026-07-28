import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
// import { assignFeedbackToReview } from "#server/utils/reviews";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { notifyRevieweeOfPublishedFeedback } from "#server/utils/notifications";
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

  // Validate request body
  await validateBody(event, apiSchemas.PublishFeedbackRequestSchema);

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
    if (reviewee.buddyId !== user.id) {
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
        publishedBy: user.id,
      })
      .where(eq(feedback.id, feedbackId))
      .returning();

    // Automatically assign to next review
    // if (feedbackItem.createdAt) {
    //   await assignFeedbackToReview(
    //     feedbackId,
    //     feedbackItem.revieweeId,
    //     feedbackItem.createdAt
    //   );
    // }

    // Notify reviewee (fire-and-forget)
    notifyRevieweeOfPublishedFeedback([feedbackItem.revieweeId]);

    const response = { success: true, feedback: updatedFeedback };
    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    console.error("Error publishing feedback:", error);
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to publish feedback",
    });
  }
});
