import { db } from "../../database/connection";
import { feedback, users, reviewSchedules } from "../../database/schema";
import { eq, desc } from "drizzle-orm";
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
    // Fetch all feedback given by the current user (regardless of published status)
    const givenFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        publishedAt: feedback.publishedAt,
        isRead: feedback.isRead,
        published: feedback.published,
        weekYear: feedback.weekYear,
        // reviewScheduleId: feedback.reviewScheduleId,
        reviewee: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.revieweeId, users.id))
      .where(eq(feedback.reviewerId, session.user.id))
      .orderBy(desc(feedback.createdAt));

    return validateResponse(
      { feedback: givenFeedback },
      apiSchemas.GetGivenFeedbackResponseSchema
    );
  } catch (error) {
    console.error("Error fetching given feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch given feedback",
    });
  }
});
