import { db } from "../../../../database/connection";
import { goals, goalMilestones } from "../../../../database/schema";
import { eq, max } from "drizzle-orm";
import { validateBody, validateResponse } from "../../../../utils/validation";
import { apiSchemas } from "../../../../schemas";

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
        message: "You can only add milestones to your own goals",
      });
    }

    // Validate request body
    const body = await validateBody(event, apiSchemas.CreateMilestoneRequestSchema);

    // Get the max displayOrder for this goal
    const [maxOrder] = await db
      .select({ maxOrder: max(goalMilestones.displayOrder) })
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId));

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    // Create the milestone
    const [milestone] = await db
      .insert(goalMilestones)
      .values({
        goalId,
        title: body.title.trim(),
        displayOrder: nextOrder,
      })
      .returning();

    const response = {
      success: true,
      milestone,
    };
    return validateResponse(response, apiSchemas.CreateMilestoneResponseSchema);
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error creating milestone:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to create milestone",
    });
  }
});
