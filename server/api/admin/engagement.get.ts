import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { sql, eq, and } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";
import { getWorkspaceId } from "../../utils/workspace";

export default defineEventHandler(async (event) => {
  try {
    // Get workspace ID from current user
    const workspaceId = getWorkspaceId(event);

    // Get feedback counts for the last 12 weeks
    // Group by week_year and count feedback items
    // Join through users to filter by workspace
    const engagementData = await db
      .select({
        weekYear: feedback.weekYear,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(
        sql`${feedback.weekYear} IS NOT NULL`,
        eq(users.workspaceId, workspaceId)
      ))
      .groupBy(feedback.weekYear)
      .orderBy(feedback.weekYear);

    // Get current week and last 12 weeks
    const now = new Date();
    const weeks: string[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));

      // Calculate ISO week number
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const weekYear = `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;

      weeks.push(weekYear);
    }

    // Create a map of week counts
    const countMap = new Map<string, number>();
    // Ensure engagementData is an array (defensive check)
    console.log(engagementData)
    if (Array.isArray(engagementData)) {
      engagementData.forEach((item) => {
        if (item.weekYear) {
          countMap.set(item.weekYear, item.count);
        }
      });
    }

    // Build response with all 12 weeks (filling in 0 for weeks with no data)
    const timeline = weeks.map((week) => ({
      week,
      count: countMap.get(week) || 0,
    }));

    return validateResponse(
      {
        success: true,
        timeline,
      },
      apiSchemas.SuccessResponseSchema.passthrough()
    );
  } catch (error) {
    console.error("Error fetching engagement data:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch engagement data",
    });
  }
});
