import { db } from "../../../../database/connection";
import { goals, goalNotes, users } from "../../../../database/schema";
import { eq } from "drizzle-orm";

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

    // Validation
    if (!body.noteText || body.noteText.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: "Note text is required",
      });
    }

    if (body.noteText.length > 2000) {
      throw createError({
        statusCode: 400,
        message: "Note text must be less than 2000 characters",
      });
    }

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

    if (goal.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Goal not found",
      });
    }

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
      .where(eq(goalNotes.id, newNote[0]?.id ?? ''))
      .limit(1);

    return { note: noteWithAuthor[0] };
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
