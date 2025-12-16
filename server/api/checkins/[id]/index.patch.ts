import { defineEventHandler, createError, readBody, getRouterParam } from "h3";
import { eq } from "drizzle-orm";
import { db } from "../../../database/connection";
import { buddyCheckins, users } from "../../../database/schema";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Checkin ID is required",
    });
  }

  const body = await validateBody(event, apiSchemas.UpdateBuddyCheckinRequestSchema);
  const { notes } = body;

  try {
    // Get the check-in to verify ownership
    const [checkin] = await db
      .select()
      .from(buddyCheckins)
      .where(eq(buddyCheckins.id, id));

    if (!checkin) {
      throw createError({
        statusCode: 404,
        statusMessage: "Check-in not found",
      });
    }

    // Verify the user is the buddy who created this check-in
    if (checkin.buddyId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You can only edit your own check-ins",
      });
    }

    // Update the check-in
    await db
      .update(buddyCheckins)
      .set({
        notes: notes.trim(),
        updatedAt: new Date(),
      })
      .where(eq(buddyCheckins.id, id));

    // Fetch and return the updated check-in with relations
    const [updatedCheckin] = await db
      .select({
        id: buddyCheckins.id,
        buddy: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        notes: buddyCheckins.notes,
        reviewScheduleId: buddyCheckins.reviewScheduleId,
        createdAt: buddyCheckins.createdAt,
        updatedAt: buddyCheckins.updatedAt,
      })
      .from(buddyCheckins)
      .innerJoin(users, eq(buddyCheckins.buddyId, users.id))
      .where(eq(buddyCheckins.id, id));

    return validateResponse(
      { checkin: updatedCheckin },
      apiSchemas.SuccessResponseSchema.passthrough()
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("403")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("404")) {
      throw error;
    }

    console.error("Failed to update check-in:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update check-in",
    });
  }
});
