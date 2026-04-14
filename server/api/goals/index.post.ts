import { db } from "#server/database/connection";
import { goals } from "#server/database/schema";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Validate request body
    const body = await validateBody(event, apiSchemas.CreateGoalRequestSchema);

    // Create the goal
    const newGoal = await db
      .insert(goals)
      .values({
        userId: session.user.id,
        goalText: body.goalText.trim(),
        description: body.description || null, // Rich text HTML from TipTap
        status: body.status || "active",
        targetDate: body.targetDate || null,
      })
      .returning();

    const response = {
      success: true,
      goal: {
        ...newGoal[0],
        milestones: [],
      },
    };
    return validateResponse(response, apiSchemas.CreateGoalResponseSchema);
  } catch (error) {
    console.error("Error creating goal:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to create goal",
    });
  }
});
