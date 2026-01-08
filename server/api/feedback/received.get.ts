import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const query = getQuery(event);
    const forUserId = query.userId as string | undefined;

    // If fetching for a specific user, verify authorization
    if (forUserId) {
      const isAdmin = session.user.role === 'admin';
      if (!isAdmin && forUserId !== session.user.id) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view this feedback",
        });
      }
    }

    const targetUserId = forUserId || session.user.id;

    // Fetch only published feedback for the target user
    const receivedFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        publishedAt: feedback.publishedAt,
        isRead: feedback.isRead,
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
    throw createError({
      statusCode: 500,
      message: "Failed to fetch received feedback",
    });
  }
});
