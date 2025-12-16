import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, sql } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  try {
    // Get feedback counts grouped by reviewer's role type
    const distribution = await db
      .select({
        roleType: users.roleType,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.reviewerId, users.id))
      .where(sql`${users.roleType} IS NOT NULL`)
      .groupBy(users.roleType);

    // Format the response as an object with role types as keys
    const result: Record<string, number> = {};

    distribution.forEach((item) => {
      if (item.roleType) {
        result[item.roleType] = item.count;
      }
    });

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
