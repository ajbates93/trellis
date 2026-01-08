import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { inArray } from "drizzle-orm";
// import { assignFeedbackToReview } from "../../utils/reviews";
import { validateBody, validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  // Validate request body
  const body = await validateBody(event, apiSchemas.PublishBatchFeedbackRequestSchema);

  try {
    // Get all feedback items
    const feedbackItems = await db
      .select({
        id: feedback.id,
        revieweeId: feedback.revieweeId,
        published: feedback.published,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(inArray(feedback.id, body.feedbackIds));

    if (feedbackItems.length === 0) {
      throw createError({
        statusCode: 404,
        message: "No feedback found with provided IDs",
      });
    }

    // Check if any are already published
    const alreadyPublished = feedbackItems.filter((f) => f.published);
    if (alreadyPublished.length > 0) {
      throw createError({
        statusCode: 400,
        message: `${alreadyPublished.length} feedback item(s) already published`,
      });
    }

    // Get unique reviewee IDs
    const revieweeIds = [
      ...new Set(feedbackItems.map((f) => f.revieweeId)),
    ];

    // Verify current user is buddy for all reviewees
    const reviewees = await db
      .select({
        id: users.id,
        buddyId: users.buddyId,
      })
      .from(users)
      .where(inArray(users.id, revieweeIds));

    const unauthorized = reviewees.filter(
      (r) => r.buddyId !== session.user.id
    );

    if (unauthorized.length > 0) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to publish feedback for some of these users",
      });
    }

    // Publish all feedback
    const updated = await db
      .update(feedback)
      .set({
        published: true,
        publishedAt: new Date(),
        publishedBy: session.user.id,
      })
      .where(inArray(feedback.id, body.feedbackIds))
      .returning();

    // Automatically assign each feedback to appropriate review
    // for (const item of feedbackItems) {
    //   if (item.createdAt) {
    //     await assignFeedbackToReview(
    //       item.id,
    //       item.revieweeId,
    //       item.createdAt
    //     );
    //   }
    // }

    const response = {
      success: true,
      publishedCount: updated.length,
      feedback: updated,
    };

    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    console.error("Error batch publishing feedback:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to batch publish feedback",
    });
  }
});
