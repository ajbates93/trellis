import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertNotSoleAdmin, anonymizeUser } from "#server/utils/accountDeletion";
import { requireAdmin } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireAdmin(event);

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  // Prevent self-deletion
  if (user.id === userId) {
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
