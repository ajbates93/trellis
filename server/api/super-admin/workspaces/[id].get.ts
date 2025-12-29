import { db } from "../../../database/connection";
import { workspaces, users } from "../../../database/schema";
import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  // Super admin middleware already verified access

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Workspace ID is required",
    });
  }

  // Fetch workspace
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);

  if (!workspace) {
    throw createError({
      statusCode: 404,
      message: "Workspace not found",
    });
  }

  // Get user count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.workspaceId, id));

  // Get admin count
  const [adminCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.workspaceId, id))
    .where(eq(users.role, "admin"));

  return {
    workspace: {
      ...workspace,
      userCount: countResult?.count || 0,
      adminCount: adminCountResult?.count || 0,
    },
  };
});
