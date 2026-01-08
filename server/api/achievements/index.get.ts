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
    const query = getQuery(event);
    const forUserId = query.userId as string | undefined;

    // If fetching for a specific user, verify authorization
    if (forUserId) {
      const isAdmin = session.user.role === 'admin';
      if (!isAdmin && forUserId !== session.user.id) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view these achievements",
        });
      }
    }

    const targetUserId = forUserId || session.user.id;

    // Get all achievements for the target user, ordered by achievedDate (newest first)
    const userAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, targetUserId))
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
