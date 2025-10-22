import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, desc } from "drizzle-orm";

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
        published: feedback.published,
        publishedAt: feedback.publishedAt,
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

    return { feedback: givenFeedback };
  } catch (error) {
    console.error("Error fetching given feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch given feedback",
    });
  }
});
