import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertNotSoleAdmin, anonymizeUser } from "#server/utils/accountDeletion";

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

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  // Prevent self-deletion
  if (session.user.id === userId) {
    throw createError({
      statusCode: 400,
      message: "Cannot delete your own account",
    });
  }

  // Get the user to be deleted — scoped to admin's workspace
  const adminWorkspaceId = event.context.workspace?.id;
  const [userToDelete] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.workspaceId, adminWorkspaceId)));

  if (!userToDelete) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  await assertNotSoleAdmin(userId, adminWorkspaceId);
  await anonymizeUser(userId);
  const response = { success: true };
  return validateResponse(response, apiSchemas.SuccessResponseSchema);
});
