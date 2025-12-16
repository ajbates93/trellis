import { defineEventHandler, createError, readBody, getRouterParam } from "h3";
import { eq } from "drizzle-orm";
import { db } from "../../../database/connection";
import {
  buddyCheckins,
  reviewSchedules,
  users,
} from "../../../database/schema";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const checkinId = getRouterParam(event, "id");

  if (!checkinId) {
    throw createError({
      statusCode: 400,
      message: "Check-in ID is required",
    });
  }

  const body = await validateBody(event, apiSchemas.AssignReviewRequestSchema);
  const { reviewScheduleId } = body;

  // Fetch check-in
  const checkin = await db.query.buddyCheckins.findFirst({
    where: eq(buddyCheckins.id, checkinId),
    with: {
      user: {
        columns: {
          id: true,
          buddyId: true,
        },
      },
    },
  });

  if (!checkin) {
    throw createError({
      statusCode: 404,
      message: "Check-in not found",
    });
  }

  // Verify authorization (buddy or admin)
  const isBuddy = checkin.user.buddyId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isBuddy && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "You are not authorized to modify this check-in",
    });
  }

  // If reviewScheduleId is provided, validate it
  if (reviewScheduleId) {
    const review = await db.query.reviewSchedules.findFirst({
      where: eq(reviewSchedules.id, reviewScheduleId),
    });

    if (!review) {
      throw createError({
        statusCode: 404,
        message: "Review schedule not found",
      });
    }

    // Verify review belongs to same user
    if (review.userId !== checkin.userId) {
      throw createError({
        statusCode: 400,
        message: "Review must belong to the same user",
      });
    }
  }

  // Update check-in
  const [updatedCheckin] = await db
    .update(buddyCheckins)
    .set({
      reviewScheduleId: reviewScheduleId || null,
      updatedAt: new Date(),
    })
    .where(eq(buddyCheckins.id, checkinId))
    .returning();

  // Fetch full check-in with related data
  const checkinWithData = await db.query.buddyCheckins.findFirst({
    where: eq(buddyCheckins.id, updatedCheckin.id),
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
