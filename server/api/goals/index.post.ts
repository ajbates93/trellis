import { db } from "../../database/connection";
import { goals } from "../../database/schema";

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

    // Validation
    if (!body.goalText || body.goalText.trim().length < 10) {
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

    return { goal: newGoal[0] };
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
