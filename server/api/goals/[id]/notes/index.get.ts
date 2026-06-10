import { db } from "#server/database/connection";
import { goals, goalNotes, users } from "#server/database/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
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

  if (!goalId) {
    throw createError({
      statusCode: 400,
      message: "Goal ID is required",
    });
  }

  try {
    // First, verify that the user has permission to view this goal's notes
    // User must be either the goal owner OR the buddy of the goal owner
    const goal = await db
      .select({
        id: goals.id,
        userId: goals.userId,
        owner: {
          id: users.id,
          buddyId: users.buddyId,
        },
      })
      .from(goals)
      .innerJoin(users, eq(goals.userId, users.id))
      .where(eq(goals.id, goalId))
      .limit(1);

    const goalData = goal[0];
    if (!goalData) {
      throw createError({
        statusCode: 404,
        message: "Goal not found",
      });
    }
    const isOwner = goalData.userId === session.user.id;
    const isBuddy = goalData.owner.buddyId === session.user.id;

    if (!isOwner && !isBuddy) {
      throw createError({
        statusCode: 403,
        message: "You don't have permission to view these notes",
      });
    }

    // Fetch all notes for this goal
    const notes = await db
      .select({
        id: goalNotes.id,
        goalId: goalNotes.goalId,
        authorId: goalNotes.authorId,
        noteText: goalNotes.noteText,
        createdAt: goalNotes.createdAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(goalNotes)
      .innerJoin(users, eq(goalNotes.authorId, users.id))
      .where(eq(goalNotes.goalId, goalId))
      .orderBy(desc(goalNotes.createdAt));

    return validateResponse(
      { notes },
      apiSchemas.GetGoalNotesResponseSchema
    );
  } catch (error) {
    console.error("Error fetching goal notes:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch goal notes",
    });
  }
});
