import { db } from "../../../database/connection";
import { users } from "../../../database/schema";
import { eq, and } from "drizzle-orm";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

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

  // Verify target user belongs to same workspace
  const adminWorkspaceId = event.context.workspace?.id;
  const [targetUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.workspaceId, adminWorkspaceId)))
    .limit(1);

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Validate request body
  const body = await validateBody(event, apiSchemas.UpdateUserRequestSchema);

  // Build update object with only provided fields
  const updateData: any = {};
  if (body.role !== undefined) updateData.role = body.role;
  if (body.buddyId !== undefined) updateData.buddyId = body.buddyId;
  if (body.roleType !== undefined) updateData.roleType = body.roleType;
  if (body.nextReviewDate !== undefined) {
    updateData.nextReviewDate = body.nextReviewDate ? new Date(body.nextReviewDate) : null;
  }
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.banned !== undefined) updateData.banned = body.banned;

  // Update user (scoped to workspace)
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, userId), eq(users.workspaceId, adminWorkspaceId)))
    .returning();

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  const response = {
    success: true,
    user: {
      ...updatedUser,
      buddyName: null,
      status: updatedUser.emailVerified ? "active" : "invited" as const,
    },
  };
  return validateResponse(response, apiSchemas.UpdateUserResponseSchema);
});
