import { defineEventHandler, createError, readBody } from "h3";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { users, buddyCheckins, reviewSchedules } from "../../database/schema";
import { findNextReview } from "../../utils/reviews";
import { validateBody, validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const body = await validateBody(event, apiSchemas.CreateBuddyCheckinRequestSchema);
  const { userId, notes } = body;

  // Verify session user is buddy of target user
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  const isBuddy = targetUser.buddyId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isBuddy && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "You are not a buddy of this user",
    });
  }

  // Find next upcoming review for auto-assignment
  const nextReview = await findNextReview(userId, new Date());

  // Create check-in
  const [createdCheckin] = await db
    .insert(buddyCheckins)
    .values({
      buddyId: session.user.id,
      userId,
      notes: notes.trim(),
      reviewScheduleId: nextReview?.id || null,
    })
    .returning();

  // Fetch full check-in with buddy and review data
  const checkinWithData = await db.query.buddyCheckins.findFirst({
    where: eq(buddyCheckins.id, createdCheckin.id),
    with: {
      buddy: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      reviewSchedule: {
        columns: {
          id: true,
          scheduledDate: true,
          name: true,
          status: true,
        },
      },
    },
  });

  return validateResponse(
    {
      id: checkinWithData.id,
      buddy: checkinWithData.buddy,
      user: checkinWithData.user,
      notes: checkinWithData.notes,
      reviewSchedule: checkinWithData.reviewSchedule,
      createdAt: checkinWithData.createdAt,
      updatedAt: checkinWithData.updatedAt,
    },
    apiSchemas.SuccessResponseSchema.passthrough()
  );
});
