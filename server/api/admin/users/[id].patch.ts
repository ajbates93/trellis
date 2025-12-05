import { db } from "../../../database/connection";
import { users } from "../../../database/schema";
import { eq } from "drizzle-orm";

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

  const body = await readBody(event);
  const { role, buddyId, roleType, nextReviewDate } = body;

  // Build update object with only provided fields
  const updateData: any = {};
  if (role !== undefined) updateData.role = role;
  if (buddyId !== undefined) updateData.buddyId = buddyId;
  if (roleType !== undefined) updateData.roleType = roleType;
  if (nextReviewDate !== undefined) {
    updateData.nextReviewDate = nextReviewDate ? new Date(nextReviewDate) : null;
  }

  // Update user
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  return {
    success: true,
    user: updatedUser,
  };
});
