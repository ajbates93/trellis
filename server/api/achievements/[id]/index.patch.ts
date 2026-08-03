import { db } from "#server/database/connection";
import { achievements } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

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

    if (achievement[0]!.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "Not authorized to update this achievement",
      });
    }

    const body = await validateBody(event, apiSchemas.UpdateAchievementRequestSchema);

    // Update the achievement
    const existingAchievement = achievement[0]!;
    const updated = await db
      .update(achievements)
      .set({
        title: body.title !== undefined ? body.title.trim() : existingAchievement.title,
        description: body.description !== undefined ? body.description : existingAchievement.description,
        achievedDate: body.achievedDate !== undefined ? body.achievedDate : existingAchievement.achievedDate,
        updatedAt: new Date(),
      })
      .where(eq(achievements.id, achievementId))
      .returning();

    return validateResponse(
      { achievement: updated[0] },
      apiSchemas.UpdateAchievementResponseSchema
    );
  } catch (error) {
    console.error("Error updating achievement:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to update achievement",
    });
  }
});
