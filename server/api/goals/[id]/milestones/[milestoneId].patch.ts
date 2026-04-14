import { db } from "#server/database/connection";
import { goals, goalMilestones } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
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

    if (goal.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only update milestones on your own goals",
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

    // Validate request body
    const body = await validateBody(event, apiSchemas.UpdateMilestoneRequestSchema);

    const updates: Partial<typeof goalMilestones.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updates.title = body.title.trim();
    }

    if (body.isCompleted !== undefined) {
      updates.isCompleted = Boolean(body.isCompleted);
      updates.completedAt = body.isCompleted ? new Date() : null;
    }

    const [milestone] = await db
      .update(goalMilestones)
      .set(updates)
      .where(eq(goalMilestones.id, milestoneId))
      .returning();

    const response = {
      success: true,
      milestone,
    };
    return validateResponse(response, apiSchemas.UpdateMilestoneResponseSchema);
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error updating milestone:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to update milestone",
    });
  }
});
