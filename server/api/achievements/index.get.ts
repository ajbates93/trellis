import { db } from "../../database/connection";
import { achievements } from "../../database/schema";
import { eq, desc } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
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
    // Get all achievements for the current user, ordered by achievedDate (newest first)
    const userAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, session.user.id))
      .orderBy(desc(achievements.achievedDate));

    return validateResponse(
      { achievements: userAchievements },
      apiSchemas.GetAchievementsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching achievements:", error);

    throw createError({
      statusCode: 500,
      message: "Failed to fetch achievements",
    });
  }
});
