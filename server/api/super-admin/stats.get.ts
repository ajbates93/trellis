import { db } from "../../database/connection";
import { workspaces, users, feedback } from "../../database/schema";
import { sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  // Super admin middleware already verified access

  // Get platform-wide statistics
  const [workspaceCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces);

  const [totalUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const [activeUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.emailVerified} = true`);

  const [totalFeedback] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedback);

  // Get workspaces ordered by user count
  const topWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      userCount: sql<number>`count(${users.id})::int`,
    })
    .from(workspaces)
    .leftJoin(users, sql`${users.workspaceId} = ${workspaces.id}`)
    .groupBy(workspaces.id, workspaces.name)
    .orderBy(sql`count(${users.id}) desc`)
    .limit(5);

  return {
    stats: {
      workspaceCount: workspaceCount?.count || 0,
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      invitedUsers: (totalUsers?.count || 0) - (activeUsers?.count || 0),
      totalFeedback: totalFeedback?.count || 0,
    },
    topWorkspaces,
  };
});
