import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const query = getQuery(event);
    const buddyId = query.buddyId as string | undefined;

    if (!buddyId) {
      throw createError({
        statusCode: 400,
        message: "buddyId query parameter is required",
      });
    }

    // Verify that the requested buddy is actually assigned to the current user
    const [targetUser] = await db
      .select({ buddyId: users.buddyId })
      .from(users)
      .where(eq(users.id, buddyId))
      .limit(1);

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    const isBuddy = targetUser.buddyId === session.user.id;
    if (!isBuddy) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to view this buddy's feedback",
      });
    }

    // Fetch only published feedback received by the buddy
    const receivedFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        publishedAt: feedback.publishedAt,
        isRead: feedback.isRead,
        isFavourite: feedback.isFavourite,
        // reviewScheduleId: feedback.reviewScheduleId,
        reviewer: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
        // review: {
        //   id: reviewSchedules.id,
        //   name: reviewSchedules.name,
        //   scheduledDate: reviewSchedules.scheduledDate,
        // },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      // .leftJoin(reviewSchedules, eq(feedback.reviewScheduleId, reviewSchedules.id))
      .where(
        and(
          eq(feedback.revieweeId, buddyId),
          eq(feedback.published, true)
        )
      )
      .orderBy(desc(feedback.publishedAt));

    return validateResponse(
      { feedback: receivedFeedback },
      apiSchemas.GetBuddyReceivedFeedbackResponseSchema
    );
  } catch (error) {
    console.error("Error fetching buddy received feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy received feedback",
    });
  }
});
