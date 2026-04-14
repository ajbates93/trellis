import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, sql, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Admin access required",
    });
  }

  // Get workspace ID from current user
  const workspaceId = getWorkspaceId(event);

  // Get query params for filtering
  const query = getQuery(event);
  const filter = query.filter as string | undefined; // 'all', 'active', 'invited'

  // Build query based on filter - always include workspace filter
  let whereClause;
  if (filter === "active") {
    whereClause = and(
      eq(users.workspaceId, workspaceId),
      eq(users.emailVerified, true)
    );
  } else if (filter === "invited") {
    whereClause = and(
      eq(users.workspaceId, workspaceId),
      eq(users.emailVerified, false)
    );
  } else {
    // 'all' or undefined = just workspace filter
    whereClause = eq(users.workspaceId, workspaceId);
  }

  // Fetch users with their buddy information
  const usersList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      roleType: users.roleType,
      buddyId: users.buddyId,
      emailVerified: users.emailVerified,
      passwordEnabled: users.passwordEnabled,
      createdAt: users.createdAt,
      avatarUrl: users.avatarUrl,
      image: users.image,
      banned: users.banned,
      banReason: users.banReason,
      nextReviewDate: users.nextReviewDate,
    })
    .from(users)
    .where(whereClause)
    .orderBy(users.createdAt);

  // Get buddy names
  const usersWithBuddies = await Promise.all(
    usersList.map(async (user) => {
      let buddyName = null;
      if (user.buddyId) {
        const buddy = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, user.buddyId))
          .limit(1);
        buddyName = buddy[0]?.name || null;
      }

      return {
        ...user,
        buddyName,
        status: user.emailVerified ? "active" : "invited",
      };
    })
  );

  // Get counts for each filter (scoped to workspace)
  const totalUsers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.workspaceId, workspaceId));
  const activeUsers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.workspaceId, workspaceId), eq(users.emailVerified, true)));
  const invitedUsers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.workspaceId, workspaceId), eq(users.emailVerified, false)));

  const response = {
    users: usersWithBuddies,
    counts: {
      all: totalUsers[0].count,
      active: activeUsers[0].count,
      invited: invitedUsers[0].count,
    },
  };
  return validateResponse(response, apiSchemas.GetUsersResponseSchema);
});
