import { db } from "#server/database/connection";
import { achievements } from "#server/database/schema";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const body = await validateBody(event, apiSchemas.CreateAchievementRequestSchema);

    // Create the achievement
    const newAchievement = await db
      .insert(achievements)
      .values({
        userId: user.id,
        title: body.title.trim(),
        description: body.description || null, // Rich text HTML from TipTap
        achievedDate: body.achievedDate,
      })
      .returning();

    return validateResponse(
      { achievement: newAchievement[0] },
      apiSchemas.CreateAchievementResponseSchema
    );
  } catch (error) {
    console.error("Error creating achievement:", error);

    // Re-throw if it's already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to create achievement",
    });
  }
});
