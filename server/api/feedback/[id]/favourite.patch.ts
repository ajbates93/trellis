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

  const body = await readBody(event);

  if (typeof body?.isFavourite !== "boolean") {
    throw createError({
      statusCode: 400,
      message: "isFavourite must be a boolean",
    });
  }

  try {
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

    if (feedbackItem.revieweeId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only favourite your own feedback",
      });
    }

    const [updatedFeedback] = await db
      .update(feedback)
      .set({ isFavourite: body.isFavourite })
      .where(eq(feedback.id, feedbackId))
      .returning();

    const response = { success: true, feedback: updatedFeedback };
    return validateResponse(response, apiSchemas.ToggleFavouriteResponseSchema);
  } catch (error) {
    console.error("Error toggling feedback favourite:", error);
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to toggle feedback favourite",
    });
  }
});
