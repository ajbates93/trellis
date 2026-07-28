import { db } from "#server/database/connection";
import { goals, goalMilestones } from "#server/database/schema";
import { eq, inArray } from "drizzle-orm";
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
        message: "You can only reorder milestones on your own goals",
      });
    }

    // Validate request body
    const body = await validateBody(event, apiSchemas.ReorderMilestonesRequestSchema);

    // Verify all milestones exist and belong to this goal
    const existingMilestones = await db
      .select({ id: goalMilestones.id })
      .from(goalMilestones)
      .where(inArray(goalMilestones.id, body.milestones.map(m => m.id)));

    if (existingMilestones.length !== body.milestones.length) {
      throw createError({
        statusCode: 400,
        message: "Some milestone IDs are invalid",
      });
    }

    // Update display order for each milestone
    await Promise.all(
      body.milestones.map((m) =>
        db
          .update(goalMilestones)
          .set({ displayOrder: m.displayOrder, updatedAt: new Date() })
          .where(eq(goalMilestones.id, m.id))
      )
    );

    const response = { success: true };
    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error reordering milestones:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to reorder milestones",
    });
  }
});
