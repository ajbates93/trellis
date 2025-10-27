import { db } from "../../database/connection";
import { goals, users } from "../../database/schema";
import { eq, desc, and, or } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Find all users where current user is their buddy
    // Then get all their goals (active and completed, exclude archived)
    const buddyGoals = await db
      .select({
        goal: {
          id: goals.id,
          goalText: goals.goalText,
          description: goals.description,
          status: goals.status,
          targetDate: goals.targetDate,
          createdAt: goals.createdAt,
          updatedAt: goals.updatedAt,
          completedAt: goals.completedAt,
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(goals)
      .innerJoin(users, eq(goals.userId, users.id))
      .where(
        and(
          eq(users.buddyId, session.user.id),
          or(eq(goals.status, "active"), eq(goals.status, "completed"))
        )
      )
      .orderBy(desc(goals.createdAt));

    // Group goals by user
    const groupedByUser = buddyGoals.reduce((acc, item) => {
      const userId = item.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: item.user,
          goals: [],
        };
      }
      acc[userId].goals.push(item.goal);
      return acc;
    }, {} as Record<string, { user: typeof item.user; goals: typeof item.goal[] }>);

    // Convert to array
    const buddyAssignments = Object.values(groupedByUser);

    return { buddyAssignments };
  } catch (error) {
    console.error("Error fetching buddy goals:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy goals",
    });
  }
});
