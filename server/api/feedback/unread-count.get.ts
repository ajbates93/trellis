import { db } from "#server/database/connection";
import { feedback } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    // Count unread published feedback received by the current user
    const unreadFeedback = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, user.id),
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
