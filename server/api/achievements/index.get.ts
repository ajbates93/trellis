import { db } from "#server/database/connection";
import { achievements } from "#server/database/schema";
import { eq, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { assertSameWorkspace } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const query = getQuery(event);
    const forUserId = query.userId as string | undefined;

    // If fetching for a specific user, verify authorization
    if (forUserId && forUserId !== user.id) {
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view these achievements",
        });
      }
      // Admins may only view users within their own workspace.
      await assertSameWorkspace(event, forUserId);
    }

    const targetUserId = forUserId || user.id;

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

    // Preserve intentional HTTP errors (e.g. the 403 from assertSameWorkspace)
    // instead of masking them as a generic 500.
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch achievements",
    });
  }
});
