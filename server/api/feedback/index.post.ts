import { db } from "#server/database/connection";
import { feedback } from "#server/database/schema";
import { format } from "date-fns";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { notifyBuddyOfNewFeedback } from "#server/utils/notifications";
import { requireUser } from "#server/utils/auth-guards";
import { assertSameWorkspace } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  // Validate request body
  const body = await validateBody(event, apiSchemas.CreateFeedbackRequestSchema);

  // Prevent self-review
  if (body.revieweeId === user.id) {
    throw createError({
      statusCode: 400,
      message: "You cannot give feedback to yourself",
    });
  }

  // Constrain the reviewee to the caller's workspace. Without this, any
  // authenticated user could write feedback into another tenant (F3) and
  // trigger a cross-tenant notification email.
  await assertSameWorkspace(event, body.revieweeId);

  // Calculate week-year format (e.g., "2025-W43")
  const now = new Date();
  const weekYear = format(now, "RRRR-'W'II");

  try {
    // Insert feedback into database
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        reviewerId: user.id,
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
