import { db } from "#server/database/connection";
import { feedback } from "#server/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const userId = user.id;

    // Build last 12 weeks list
    const now = new Date();
    const weekLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      weekLabels.push(getISOWeek(date));
    }

    // Feedback given per week (uses weekYear column)
    const givenByWeek = await db
      .select({
        weekYear: feedback.weekYear,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.reviewerId, userId),
          sql`${feedback.weekYear} IS NOT NULL`
        )
      )
      .groupBy(feedback.weekYear);

    // Feedback received per week (published only, use publishedAt)
    // weekYear is set on the reviewer's submission, not the receiver — so we
    // derive the week from publishedAt for received feedback.
    const receivedByWeek = await db
      .select({
        weekYear: sql<string>`to_char(${feedback.publishedAt}, 'IYYY-"W"IW')`,
        count: sql<number>`count(*)::int`,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true),
          sql`${feedback.publishedAt} IS NOT NULL`
        )
      )
      .groupBy(sql`to_char(${feedback.publishedAt}, 'IYYY-"W"IW')`);

    // Build maps
    const givenMap = new Map<string, number>();
    givenByWeek.forEach((row) => {
      if (row.weekYear) givenMap.set(row.weekYear, row.count);
    });

    const receivedMap = new Map<string, number>();
    receivedByWeek.forEach((row) => {
      if (row.weekYear) receivedMap.set(row.weekYear, row.count);
    });

    // Assemble response
    const weeks = weekLabels.map((week) => ({
      week,
      given: givenMap.get(week) ?? 0,
      received: receivedMap.get(week) ?? 0,
    }));

    return validateResponse(
      { weeks },
      apiSchemas.GetFeedbackPulseResponseSchema
    );
  } catch (error) {
    console.error("Error fetching feedback pulse:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback pulse",
    });
  }
});
