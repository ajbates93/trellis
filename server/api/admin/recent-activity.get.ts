import { db } from "../../database/connection";
import { feedback, goals, users } from "../../database/schema";
import { eq, sql, desc, or } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get recent feedback (last 10)
    const recentFeedback = await db
      .select({
        id: feedback.id,
        type: sql<string>`'feedback'`,
        content: feedback.content,
        createdAt: feedback.createdAt,
        reviewerName: sql<string>`reviewer.name`,
        revieweeName: sql<string>`reviewee.name`,
        published: feedback.published,
      })
      .from(feedback)
      .leftJoin(sql`users as reviewer`, eq(feedback.reviewerId, sql`reviewer.id`))
      .leftJoin(sql`users as reviewee`, eq(feedback.revieweeId, sql`reviewee.id`))
      .orderBy(desc(feedback.createdAt))
      .limit(10);

    // Get recent goals (last 10)
    const recentGoals = await db
      .select({
        id: goals.id,
        type: sql<string>`'goal'`,
        content: goals.goalText,
        createdAt: goals.createdAt,
        userName: users.name,
        status: goals.status,
      })
      .from(goals)
      .leftJoin(users, eq(goals.userId, users.id))
      .orderBy(desc(goals.createdAt))
      .limit(10);

    // Combine and sort by date (most recent first)
    const allActivity = [
      ...recentFeedback.map((item) => ({
        id: item.id,
        type: item.type,
        content: item.content,
        createdAt: item.createdAt,
        metadata: {
          reviewerName: item.reviewerName,
          revieweeName: item.revieweeName,
          published: item.published,
        },
      })),
      ...recentGoals.map((item) => ({
        id: item.id,
        type: item.type,
        content: item.content,
        createdAt: item.createdAt,
        metadata: {
          userName: item.userName,
          status: item.status,
        },
      })),
    ]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20); // Get top 20 most recent

    return {
      activity: allActivity,
    };
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch recent activity",
    });
  }
});
