import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { eq, sql, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get top 10 users by feedback given (as reviewer)
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
      .groupBy(users.id, users.name, users.email, users.avatarUrl, users.image, users.roleType)
      .orderBy(desc(sql`count(${feedback.id})`))
      .limit(10);

    return {
      contributors: topContributors,
    };
  } catch (error) {
    console.error("Error fetching top contributors:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch top contributors",
    });
  }
});
