import { db } from "#server/database/connection";
import { goals, goalMilestones } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const goalId = getRouterParam(event, "id");
  const milestoneId = getRouterParam(event, "milestoneId");

  if (!goalId || !milestoneId) {
    throw createError({
      statusCode: 400,
      message: "Goal ID and Milestone ID are required",
    });
  }

  try {
    // Verify the goal exists and belongs to the user
    const [goal] = await db
      .select({ id: goals.id, userId: goals.userId })
      .from(goals)
      .where(eq(goals.id, goalId));

    if (!goal) {
      throw createError({
        statusCode: 404,
        message: "Goal not found",
      });
    }

    if (goal.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only delete milestones on your own goals",
      });
    }

    // Verify the milestone exists and belongs to this goal
    const [existingMilestone] = await db
      .select()
      .from(goalMilestones)
      .where(
        and(eq(goalMilestones.id, milestoneId), eq(goalMilestones.goalId, goalId))
      );

    if (!existingMilestone) {
      throw createError({
        statusCode: 404,
        message: "Milestone not found",
      });
    }

    await db.delete(goalMilestones).where(eq(goalMilestones.id, milestoneId));

    return validateResponse(
      { success: true },
      apiSchemas.SuccessResponseSchema
    );
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error deleting milestone:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to delete milestone",
    });
  }
});
