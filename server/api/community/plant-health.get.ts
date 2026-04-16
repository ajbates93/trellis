import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { sql, gte, eq, and } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { getWorkspaceId } from "#server/utils/workspace";
import { computePlantHealth } from "#server/utils/community-scoring";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const workspaceId = getWorkspaceId(event);

  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Count feedback in last 2 weeks from users in this workspace
    const [feedbackResult] = await db
      .select({
        count: sql<number>`count(${feedback.id})::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          gte(feedback.createdAt, twoWeeksAgo),
        ),
      );

    // Count active users in workspace (emailVerified = true means they've logged in)
    const [userResult] = await db
      .select({
        count: sql<number>`count(${users.id})::int`,
      })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          eq(users.emailVerified, true),
        ),
      );

    const feedbackCount = feedbackResult?.count ?? 0;
    const activeUserCount = userResult?.count ?? 0;

    const health = computePlantHealth(feedbackCount, activeUserCount);

    return validateResponse(health, apiSchemas.GetPlantHealthResponseSchema);
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error("Error computing plant health:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to compute plant health",
    });
  }
});
