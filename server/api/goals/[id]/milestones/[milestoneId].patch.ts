import { db } from "../../../../database/connection";
import { goals, goalMilestones } from "../../../../database/schema";
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

    const body = await readBody(event);
    const { title, isCompleted } = body;

    const updates: Partial<typeof goalMilestones.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        throw createError({
          statusCode: 400,
          message: "Milestone title cannot be empty",
        });
      }
      if (title.length > 200) {
        throw createError({
          statusCode: 400,
          message: "Milestone title must be 200 characters or less",
        });
      }
      updates.title = title.trim();
    }

    if (isCompleted !== undefined) {
      updates.isCompleted = Boolean(isCompleted);
      updates.completedAt = isCompleted ? new Date() : null;
    }

    const [milestone] = await db
      .update(goalMilestones)
      .set(updates)
      .where(eq(goalMilestones.id, milestoneId))
      .returning();

    return { milestone };
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
