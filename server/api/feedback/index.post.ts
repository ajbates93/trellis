import { db } from "../../database/connection";
import { feedback } from "../../database/schema";
import { format } from "date-fns";
import { validateBody, validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";
import { notifyBuddyOfNewFeedback } from "../../utils/notifications";

export default defineEventHandler(async (event) => {
  // Get session/user from better-auth
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  // Validate request body
  const body = await validateBody(event, apiSchemas.CreateFeedbackRequestSchema);

  // Prevent self-review
  if (body.revieweeId === session.user.id) {
    throw createError({
      statusCode: 400,
      message: "You cannot give feedback to yourself",
    });
  }

  // Calculate week-year format (e.g., "2025-W43")
  const now = new Date();
  const weekYear = format(now, "RRRR-'W'II");

  try {
    // Insert feedback into database
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        reviewerId: session.user.id,
        revieweeId: body.revieweeId,
        content: body.content.trim(),
        weekYear,
        isRead: false,
      })
      .returning();

    // Notify buddy (fire-and-forget)
    notifyBuddyOfNewFeedback(body.revieweeId);

    // Validate response
    const response = {
      success: true,
      feedback: newFeedback,
    };

    return validateResponse(response, apiSchemas.CreateFeedbackResponseSchema);
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to submit feedback. Please try again.",
    });
  }
});
