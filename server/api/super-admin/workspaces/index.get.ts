import { db } from "../../../database/connection";
import { workspaces, users } from "../../../database/schema";
import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  // Super admin middleware already verified access

  // Fetch all workspaces with user counts
  const allWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      logoUrl: workspaces.logoUrl,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .orderBy(workspaces.createdAt);

  // Get user counts for each workspace
  const workspacesWithCounts = await Promise.all(
    allWorkspaces.map(async (workspace) => {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.workspaceId, workspace.id));

      return {
        ...workspace,
        userCount: countResult?.count || 0,
      };
    })
  );

  return {
    workspaces: workspacesWithCounts,
  };
});
