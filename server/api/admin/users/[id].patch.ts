import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireAdmin } from "#server/utils/auth-guards";
import { assertSameWorkspace } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

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

  // The buddy relationship is a trust edge (a buddy gets read access to the
  // partner's feedback, goals, reviews and check-ins). An admin must not be
  // able to assign a buddy from another workspace, which would grant that
  // outsider read access into this tenant (F10).
  if (body.buddyId) {
    await assertSameWorkspace(event, body.buddyId);
  }

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
