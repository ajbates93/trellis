import { db } from "../../../../database/connection";
import { goals, goalMilestones } from "../../../../database/schema";
import { eq, inArray } from "drizzle-orm";

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
        message: "You can only reorder milestones on your own goals",
      });
    }

    const body = await readBody(event);
    const { milestoneIds } = body;

    if (!Array.isArray(milestoneIds) || milestoneIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: "milestoneIds array is required",
      });
    }

    // Verify all milestones exist and belong to this goal
    const existingMilestones = await db
      .select({ id: goalMilestones.id })
      .from(goalMilestones)
      .where(inArray(goalMilestones.id, milestoneIds));

    if (existingMilestones.length !== milestoneIds.length) {
      throw createError({
        statusCode: 400,
        message: "Some milestone IDs are invalid",
      });
    }

    // Update display order for each milestone
    await Promise.all(
      milestoneIds.map((id, index) =>
        db
          .update(goalMilestones)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(eq(goalMilestones.id, id))
      )
    );

    return { success: true };
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
