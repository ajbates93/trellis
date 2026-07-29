import { defineEventHandler, createError, readBody } from "h3";
import { eq } from "drizzle-orm";
import { db } from "#server/database/connection";
import { users, buddyCheckins, reviewSchedules } from "#server/database/schema";
import { findNextReview } from "#server/utils/reviews";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";
import { assertSameWorkspace } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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

  const isBuddy = targetUser.buddyId === user.id;
  const isAdmin = user.role === "admin";

  if (!isBuddy && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "You are not a buddy of this user",
    });
  }

  // An admin acting on a user who isn't their buddy may only do so within their
  // own workspace, mirroring checkins/buddy.get.ts. Without this an admin could
  // write a check-in onto - and read back the details of - a user in another
  // tenant (F2).
  if (isAdmin && !isBuddy) {
    await assertSameWorkspace(event, userId);
  }

  // Find next upcoming review for auto-assignment
  const nextReview = await findNextReview(userId, new Date());

  // Create check-in
  const [createdCheckin] = await db
    .insert(buddyCheckins)
    .values({
      buddyId: user.id,
      userId,
      notes: notes.trim(),
      reviewScheduleId: nextReview?.id || null,
    })
    .returning();

  if (!createdCheckin) {
    throw createError({
      statusCode: 500,
      message: "Failed to create check-in",
    });
  }

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

  if (!checkinWithData) {
    throw createError({
      statusCode: 500,
      message: "Failed to load created check-in",
    });
  }

  return validateResponse(
    {
      success: true,
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
