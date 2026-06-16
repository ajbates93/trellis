import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, sql } from "drizzle-orm";

const VALID_TASK_IDS = [
  "submit-feedback",
  "view-inbox",
  "create-goal",
  "add-achievement",
];

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const body = await readBody(event);
    const { taskId } = body;

    if (!taskId || !VALID_TASK_IDS.includes(taskId)) {
      throw createError({
        statusCode: 400,
        message: `Invalid task ID. Must be one of: ${VALID_TASK_IDS.join(", ")}`,
      });
    }

    // Get current user's onboarding tasks
    const currentUser = await db
      .select({ onboardingTasks: users.onboardingTasks })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!currentUser.length) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    const currentTasks = currentUser[0]?.onboardingTasks || [];

    // Don't add if already completed
    if (currentTasks.includes(taskId)) {
      return { onboardingTasks: currentTasks, alreadyCompleted: true };
    }

    // Add new task to array
    const updatedTasks = [...currentTasks, taskId];

    await db
      .update(users)
      .set({
        onboardingTasks: updatedTasks,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return { onboardingTasks: updatedTasks, alreadyCompleted: false };
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    console.error("Error updating onboarding task:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to update onboarding progress",
    });
  }
});
