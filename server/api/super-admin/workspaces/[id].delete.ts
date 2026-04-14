import { db } from "#server/database/connection";
import { workspaces, users } from "#server/database/schema";
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

  // Check workspace exists
  const [existing] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: "Workspace not found",
    });
  }

  // Check if workspace has users (safety check)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.workspaceId, id));

  if (countResult && countResult.count > 0) {
    throw createError({
      statusCode: 400,
      message: `Cannot delete workspace with ${countResult.count} users. Remove all users first.`,
    });
  }

  // Delete workspace (cascade will handle related data if any)
  await db.delete(workspaces).where(eq(workspaces.id, id));

  return {
    success: true,
    message: "Workspace deleted successfully",
  };
});
