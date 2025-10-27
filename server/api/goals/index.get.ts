import { db } from "../../database/connection";
import { goals, users } from "../../database/schema";
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
    // Fetch all goals for the current user (all statuses)
    const userGoals = await db
      .select({
        id: goals.id,
        goalText: goals.goalText,
        description: goals.description,
        status: goals.status,
        targetDate: goals.targetDate,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
        completedAt: goals.completedAt,
      })
      .from(goals)
      .where(eq(goals.userId, session.user.id))
      .orderBy(desc(goals.createdAt));

    return { goals: userGoals };
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch goals",
    });
  }
});
