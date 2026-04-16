import { db } from "#server/database/connection";
import { achievements } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const achievementId = getRouterParam(event, "id");

  if (!achievementId) {
    throw createError({
      statusCode: 400,
      message: "Achievement ID is required",
    });
  }

  try {
    // Verify the achievement belongs to the current user
    const achievement = await db
      .select()
      .from(achievements)
      .where(eq(achievements.id, achievementId));

    if (!achievement || achievement.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Achievement not found",
      });
    }

    if (achievement[0]!.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        message: "Not authorized to delete this achievement",
      });
    }

    // Delete the achievement
    await db
      .delete(achievements)
      .where(eq(achievements.id, achievementId));

    return validateResponse(
      { success: true },
      apiSchemas.SuccessResponseSchema
    );
  } catch (error) {
    console.error("Error deleting achievement:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to delete achievement",
    });
  }
});
