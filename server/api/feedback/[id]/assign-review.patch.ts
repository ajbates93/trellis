import { db } from "../../../database/connection";
import { feedback, users, reviewSchedules } from "../../../database/schema";
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

  const feedbackId = getRouterParam(event, "id");

  if (!feedbackId) {
    throw createError({
      statusCode: 400,
      message: "Feedback ID is required",
    });
  }

  const body = await validateBody(event, apiSchemas.AssignReviewRequestSchema);
  const { reviewScheduleId } = body;

  try {
    // Get the feedback item
    const [feedbackItem] = await db
      .select({
        id: feedback.id,
        revieweeId: feedback.revieweeId,
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

    // AUTHORIZATION CHECK: Only buddy or admin can reassign
    const isBuddy = reviewee.buddyId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only the buddy or admin can reassign this feedback",
      });
    }

    // If assigning to a review, verify it belongs to the same reviewee
    if (reviewScheduleId) {
      const [review] = await db
        .select()
        .from(reviewSchedules)
        .where(eq(reviewSchedules.id, reviewScheduleId))
        .limit(1);

      if (!review) {
        throw createError({
          statusCode: 404,
          message: "Review not found",
        });
      }

      if (review.userId !== feedbackItem.revieweeId) {
        throw createError({
          statusCode: 400,
          message: "Cannot assign feedback to a review for a different user",
        });
      }
    }

    // Update feedback with new review assignment
    const [updated] = await db
      .update(feedback)
      .set({ reviewScheduleId: reviewScheduleId || null })
      .where(eq(feedback.id, feedbackId))
      .returning();

    return validateResponse(
      { success: true, feedback: updated },
      apiSchemas.SuccessResponseSchema.passthrough()
    );
  } catch (error) {
    console.error("Error reassigning feedback:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to reassign feedback",
    });
  }
});
