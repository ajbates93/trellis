import { db } from "#server/database/connection";
import { goals } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateBody, validateResponse } from "#server/utils/validation";
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
    // Validate request body
    const body = await validateBody(event, apiSchemas.UpdateGoalStatusRequestSchema);

    // Update the goal status (only if user is the owner)
    const updatedGoal = await db
      .update(goals)
      .set({
        status: body.status,
        ...(body.status === "completed" && { completedAt: new Date() }),
        ...(body.status === "active" && { completedAt: null }),
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, user.id)))
      .returning();

    if (updatedGoal.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Goal not found or you don't have permission to edit it",
      });
    }

    const response = {
      success: true,
      goal: {
        ...updatedGoal[0],
        milestones: [],
      },
    };
    return validateResponse(response, apiSchemas.UpdateGoalResponseSchema);
  } catch (error) {
    console.error("Error updating goal status:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to update goal status",
    });
  }
});
