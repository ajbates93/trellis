import { db } from "../../database/connection";
import { goals, goalMilestones } from "../../database/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
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

    // Fetch milestones for all goals
    const goalIds = userGoals.map((g) => g.id);
    const milestones =
      goalIds.length > 0
        ? await db
            .select()
            .from(goalMilestones)
            .where(inArray(goalMilestones.goalId, goalIds))
            .orderBy(asc(goalMilestones.displayOrder), asc(goalMilestones.createdAt))
        : [];

    // Group milestones by goalId
    const milestonesByGoal = milestones.reduce(
      (acc, m) => {
        if (!acc[m.goalId]) acc[m.goalId] = [];
        acc[m.goalId].push(m);
        return acc;
      },
      {} as Record<string, typeof milestones>
    );

    // Attach milestones to goals
    const goalsWithMilestones = userGoals.map((goal) => ({
      ...goal,
      milestones: milestonesByGoal[goal.id] || [],
    }));

    const response = { goals: goalsWithMilestones };
    return validateResponse(response, apiSchemas.GetGoalsResponseSchema);
  } catch (error) {
    console.error("Error fetching goals:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch goals",
    });
  }
});
