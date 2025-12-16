import { db } from "../../database/connection";
import { achievements } from "../../database/schema";
import { validateBody, validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const body = await validateBody(event, apiSchemas.CreateAchievementRequestSchema);

    // Create the achievement
    const newAchievement = await db
      .insert(achievements)
      .values({
        userId: session.user.id,
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
