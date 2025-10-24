import { db } from "../../../database/connection";
import { goals } from "../../../database/schema";
import { eq, and } from "drizzle-orm";

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
    const body = await readBody(event);

    // Validation
    if (body.goalText !== undefined) {
      if (body.goalText.trim().length < 10) {
        throw createError({
          statusCode: 400,
          message: "Goal text must be at least 10 characters",
        });
      }

      if (body.goalText.length > 500) {
        throw createError({
          statusCode: 400,
          message: "Goal text must be less than 500 characters",
        });
      }
    }

    // Update the goal (only if user is the owner)
    const updatedGoal = await db
      .update(goals)
      .set({
        ...(body.goalText !== undefined && { goalText: body.goalText.trim() }),
        ...(body.targetDate !== undefined && { targetDate: body.targetDate }),
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)))
      .returning();

    if (updatedGoal.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Goal not found or you don't have permission to edit it",
      });
    }

    return { goal: updatedGoal[0] };
  } catch (error) {
    console.error("Error updating goal:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to update goal",
    });
  }
});
