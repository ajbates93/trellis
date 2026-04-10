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
    const userId = session.user.id;

    // Feedback received (published only)
    const received = await db
      .select({
        id: feedback.id,
        personName: users.name,
        isRead: feedback.isRead,
        createdAt: feedback.publishedAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true)
        )
      )
      .orderBy(desc(feedback.publishedAt))
      .limit(10);

    // Feedback given
    const given = await db
      .select({
        id: feedback.id,
        personName: users.name,
        isRead: feedback.isRead,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.revieweeId, users.id))
      .where(eq(feedback.reviewerId, userId))
      .orderBy(desc(feedback.createdAt))
      .limit(10);

    // Merge and sort by date descending
    const activities = [
      ...received.map((r) => ({
        id: r.id,
        type: "feedback_received" as const,
        description: `You received feedback from ${r.personName}`,
        personName: r.personName,
        isRead: r.isRead,
        createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
      ...given.map((g) => ({
        id: g.id,
        type: "feedback_given" as const,
        description: `You submitted feedback for ${g.personName}`,
        personName: g.personName,
        isRead: null,
        createdAt: g.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return validateResponse(
      { activities },
      apiSchemas.GetDashboardActivityResponseSchema
    );
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard activity",
    });
  }
});
