import { db } from "#server/database/connection";
import { users, feedback, goals, reviewSchedules } from "#server/database/schema";
import { eq, or, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

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

  // Delete related data in a transaction
  try {
    // Find the first available admin in the same workspace to reassign buddies
    const [firstAdmin] = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.workspaceId, adminWorkspaceId)))
      .limit(1);

    // Delete feedback where user is reviewer or reviewee
    await db.delete(feedback).where(
      or(
        eq(feedback.reviewerId, userId),
        eq(feedback.revieweeId, userId)
      )
    );

    // Delete goals
    await db.delete(goals).where(eq(goals.userId, userId));

    // Delete review schedules where user is involved
    await db.delete(reviewSchedules).where(
      or(
        eq(reviewSchedules.userId, userId),
        eq(reviewSchedules.buddyId, userId)
      )
    );

    // Update users who have this user as their buddy
    // Assign them to the first admin if available, otherwise set to null
    await db
      .update(users)
      .set({ buddyId: firstAdmin?.id || null })
      .where(eq(users.buddyId, userId));

    // Finally, delete the user
    await db.delete(users).where(eq(users.id, userId));

    const response = { success: true };
    return validateResponse(response, apiSchemas.SuccessResponseSchema);
  } catch (error) {
    console.error("Failed to delete user:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to delete user",
    });
  }
});
