import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq, sql, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  try {
    const workspaceId = getWorkspaceId(event);

    // Get top 10 users by feedback given (as reviewer), scoped to the
    // caller's workspace.
    const topContributors = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        image: users.image,
        roleType: users.roleType,
        feedbackCount: sql<number>`count(${feedback.id})::int`,
      })
      .from(users)
      .leftJoin(feedback, eq(users.id, feedback.reviewerId))
      .where(eq(users.workspaceId, workspaceId))
      .groupBy(users.id, users.name, users.email, users.avatarUrl, users.image, users.roleType)
      .orderBy(desc(sql`count(${feedback.id})`))
      .limit(10);

    return validateResponse(
      { contributors: topContributors },
      apiSchemas.GetTopContributorsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching top contributors:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch top contributors",
    });
  }
});
