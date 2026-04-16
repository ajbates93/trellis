import { db } from "#server/database/connection";
import { workspaces, users } from "#server/database/schema";
import { eq } from "drizzle-orm";

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

  // Fetch all users in this workspace
  const workspaceUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      roleType: users.roleType,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(users)
    .where(eq(users.workspaceId, id))
    .orderBy(users.createdAt);

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    users: workspaceUsers.map(user => ({
      ...user,
      status: user.emailVerified ? "active" : "invited",
    })),
  };
});
