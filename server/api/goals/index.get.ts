import { db } from "#server/database/connection";
import { goals, goalMilestones } from "#server/database/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertSameWorkspace } from "#server/utils/workspace";

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
    if (forUserId && forUserId !== session.user.id) {
      const isAdmin = session.user.role === 'admin';
      if (!isAdmin) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view these goals",
        });
      }
      // Admins may only view users within their own workspace.
      await assertSameWorkspace(event, forUserId);
    }

    const targetUserId = forUserId || session.user.id;

    // Fetch all goals for the target user (all statuses)
    const userGoals = await db
      .select({
        id: goals.id,
        userId: goals.userId,
        goalText: goals.goalText,
        description: goals.description,
        status: goals.status,
        targetDate: goals.targetDate,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
        completedAt: goals.completedAt,
      })
      .from(goals)
      .where(eq(goals.userId, targetUserId))
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
        const goalId = m.goalId;
        if (!acc[goalId]) acc[goalId] = [];
        acc[goalId].push(m);
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
