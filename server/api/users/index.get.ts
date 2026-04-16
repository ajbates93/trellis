import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Get workspace ID from current user
    const workspaceId = getWorkspaceId(event);

    // Fetch all users in the same workspace, selecting only necessary fields
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.workspaceId, workspaceId));

    return validateResponse(
      { users: allUsers },
      apiSchemas.GetAllUsersResponseSchema
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch users",
    });
  }
});
