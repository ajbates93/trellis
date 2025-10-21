import { db } from "../../database/connection";
import { feedback } from "../../database/schema";
import { format } from "date-fns";

export default defineEventHandler(async (event) => {
  // Get session/user from better-auth
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const body = await readBody(event);
  const { revieweeId, content } = body;

  // Validation
  if (!revieweeId || !content) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields: revieweeId and content",
    });
  }

  if (content.trim().length < 10) {
    throw createError({
      statusCode: 400,
      message: "Feedback must be at least 10 characters long",
    });
  }

  // Prevent self-review
  if (revieweeId === session.user.id) {
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
        revieweeId,
        content: content.trim(),
        weekYear,
        isRead: false,
      })
      .returning();

    return {
      success: true,
      feedback: newFeedback,
    };
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to submit feedback. Please try again.",
    });
  }
});
