import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertSameWorkspace } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const query = getQuery(event);
    const forUserId = query.userId as string | undefined;

    // If fetching for a specific user, verify authorization
    if (forUserId && forUserId !== user.id) {
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view this feedback",
        });
      }
      // Admins may only view users within their own workspace.
      await assertSameWorkspace(event, forUserId);
    }

    const targetUserId = forUserId || user.id;

    // Fetch only published feedback for the target user
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
          roleType: users.roleType,
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
          eq(feedback.revieweeId, targetUserId),
          eq(feedback.published, true)
        )
      )
      .orderBy(desc(feedback.publishedAt));

    const response = { feedback: receivedFeedback };
    return validateResponse(response, apiSchemas.GetReceivedFeedbackResponseSchema);
  } catch (error) {
    console.error("Error fetching received feedback:", error);

    // Preserve intentional HTTP errors (e.g. the 403 from assertSameWorkspace
    // or the non-admin permission check) instead of masking them as a 500.
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch received feedback",
    });
  }
});
