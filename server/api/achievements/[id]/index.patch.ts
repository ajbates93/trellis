import { db } from "../../../database/connection";
import { achievements } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

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
