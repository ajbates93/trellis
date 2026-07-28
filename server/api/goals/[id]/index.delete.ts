import { db } from "#server/database/connection";
import { goals } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const goalId = getRouterParam(event, "id");

  if (!goalId) {
    throw createError({
      statusCode: 400,
      message: "Goal ID is required",
    });
  }

  try {
    // Delete the goal (only if user is the owner)
    // Note: goal_notes will be cascade deleted due to foreign key constraint
    const deletedGoal = await db
      .delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, user.id)))
      .returning();

    if (deletedGoal.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Goal not found or you don't have permission to delete it",
      });
    }

    const response = { success: true, goal: deletedGoal[0] };
    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    console.error("Error deleting goal:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to delete goal",
    });
  }
});
