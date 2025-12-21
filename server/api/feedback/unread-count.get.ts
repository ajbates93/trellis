import { db } from "../../database/connection";
import { feedback } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Count unread published feedback received by the current user
    const unreadFeedback = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, session.user.id),
          eq(feedback.published, true),
          eq(feedback.isRead, false)
        )
      );

    return validateResponse(
      { count: unreadFeedback.length },
      apiSchemas.GetUnreadCountResponseSchema
    );
  } catch (error) {
    console.error("Error fetching unread count:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch unread count",
    });
  }
});
