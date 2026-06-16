import { db } from "#server/database/connection";
import { goals, goalNotes, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
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

  if (!goalId) {
    throw createError({
      statusCode: 400,
      message: "Goal ID is required",
    });
  }

  try {
    const body = await readBody(event);

    // First, verify that the user has permission to add notes to this goal
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
        message: "You don't have permission to add notes to this goal",
      });
    }

    // Create the note
    const newNote = await db
      .insert(goalNotes)
      .values({
        goalId: goalId,
        authorId: session.user.id,
        noteText: body.noteText.trim(),
      })
      .returning();

    const createdNote = newNote[0];
    if (!createdNote) {
      throw createError({
        statusCode: 500,
        message: "Failed to create note",
      });
    }

    // Fetch the note with author details
    const noteWithAuthor = await db
      .select({
        id: goalNotes.id,
        noteText: goalNotes.noteText,
        createdAt: goalNotes.createdAt,
        updatedAt: goalNotes.updatedAt,
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
      .where(eq(goalNotes.id, createdNote.id))
      .limit(1);

    return validateResponse(
      { note: noteWithAuthor[0] },
      apiSchemas.CreateGoalNoteResponseSchema
    );
  } catch (error) {
    console.error("Error creating goal note:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to create goal note",
    });
  }
});
