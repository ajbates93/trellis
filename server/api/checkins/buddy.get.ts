import { defineEventHandler, createError, getQuery } from "h3";
import { eq, desc, and } from "drizzle-orm";
import { db } from "#server/database/connection";
import { users, buddyCheckins } from "#server/database/schema";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const query = getQuery(event);
  const buddyIdFilter = query.buddyId as string | undefined;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

  if (limit < 1 || limit > 100) {
    throw createError({
      statusCode: 400,
      message: "limit must be between 1 and 100",
    });
  }

  // If filtering by specific buddy, verify it's one of user's buddies
  if (buddyIdFilter) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, buddyIdFilter),
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

    // Fetch check-ins for specific buddy
    const checkins = await db.query.buddyCheckins.findMany({
      where: eq(buddyCheckins.userId, buddyIdFilter),
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
      orderBy: desc(buddyCheckins.createdAt),
      limit,
    });

    return validateResponse(
      checkins.map((c) => ({
        id: c.id,
        buddyId: c.buddyId,
        userId: c.userId,
        reviewScheduleId: c.reviewScheduleId,
        buddy: c.buddy,
        user: c.user,
        notes: c.notes,
        reviewSchedule: c.reviewSchedule,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      apiSchemas.GetBuddyCheckinsArrayResponseSchema
    );
  }

  // If no filter, get all buddies of session user and their check-ins
  const sessionUserBuddies = await db.query.users.findMany({
    where: eq(users.buddyId, session.user.id),
    columns: {
      id: true,
    },
  });

  const buddyIds = sessionUserBuddies.map((b) => b.id);

  if (buddyIds.length === 0) {
    return [];
  }

  // Get check-ins for all buddies of session user
  const checkins = await db.query.buddyCheckins.findMany({
    where: (t) =>
      buddyIds.length > 0
        ? and(eq(t.buddyId, session.user.id))
        : undefined,
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
    orderBy: desc(buddyCheckins.createdAt),
    limit,
  });

  return validateResponse(
    checkins.map((c) => ({
      id: c.id,
      buddyId: c.buddyId,
      userId: c.userId,
      reviewScheduleId: c.reviewScheduleId,
      buddy: c.buddy,
      user: c.user,
      notes: c.notes,
      reviewSchedule: c.reviewSchedule,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    apiSchemas.GetBuddyCheckinsArrayResponseSchema
  );
});
