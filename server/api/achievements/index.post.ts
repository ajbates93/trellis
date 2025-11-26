import { db } from "../../database/connection";
import { achievements } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const body = await readBody(event);

    // Validation
    if (!body.title || body.title.trim().length < 5) {
      throw createError({
        statusCode: 400,
        message: "Achievement title must be at least 5 characters",
      });
    }

    if (body.title.length > 255) {
      throw createError({
        statusCode: 400,
        message: "Achievement title must be less than 255 characters",
      });
    }

    if (!body.achievedDate) {
      throw createError({
        statusCode: 400,
        message: "Achievement date is required",
      });
    }

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

    return { achievement: newAchievement[0] };
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
