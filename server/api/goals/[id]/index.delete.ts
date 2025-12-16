import { db } from "../../../database/connection";
import { goals } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

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
      .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)))
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
