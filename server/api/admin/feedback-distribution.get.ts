import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, sql, and } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";
import { getWorkspaceId } from "../../utils/workspace";

export default defineEventHandler(async (event) => {
  try {
    // Get workspace ID from current user
    const workspaceId = getWorkspaceId(event);

    // Get feedback counts grouped by reviewer's role type
    // Filter by workspace
    const distribution = await db
      .select({
        roleType: users.roleType,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(
        sql`${users.roleType} IS NOT NULL`,
        eq(users.workspaceId, workspaceId)
      ))
      .groupBy(users.roleType);

    // Format the response as an object with role types as keys
    const result: Record<string, number> = {};

    // Ensure distribution is an array (defensive check)
    if (Array.isArray(distribution)) {
      distribution.forEach((item) => {
        if (item.roleType) {
          result[item.roleType] = item.count;
        }
      });
    }

    // Ensure all role types are present (even if 0)
    if (!result.dev) result.dev = 0;
    if (!result.design) result.design = 0;
    if (!result.qa) result.qa = 0;

    return validateResponse(
      result,
      apiSchemas.GetFeedbackDistributionResponseSchema
    );
  } catch (error) {
    console.error("Error fetching feedback distribution:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback distribution",
    });
  }
});
