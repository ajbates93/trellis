import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { sql, eq, and, gte, lt } from "drizzle-orm";
import { startOfISOWeek, subWeeks, subDays } from "date-fns";
import { validateResponse } from "#server/utils/validation";
import { getWorkspaceId } from "#server/utils/workspace";
import { computeStreak } from "#server/utils/community-scoring";
import { apiSchemas } from "#server/schemas";

type Period = "this-week" | "last-7-days" | "last-30-days" | "all-time";

function getDateRanges(period: Period) {
  const now = new Date();
  switch (period) {
    case "this-week": {
      const start = startOfISOWeek(now);
      const prevStart = subWeeks(start, 1);
      return { start, prevStart, prevEnd: start };
    }
    case "last-7-days": {
      const start = subDays(now, 7);
      const prevStart = subDays(now, 14);
      return { start, prevStart, prevEnd: start };
    }
    case "last-30-days": {
      const start = subDays(now, 30);
      const prevStart = subDays(now, 60);
      return { start, prevStart, prevEnd: start };
    }
    case "all-time":
      return { start: null, prevStart: null, prevEnd: null };
  }
}

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const workspaceId = getWorkspaceId(event);
  const query = getQuery(event);
  const period = (["this-week", "last-7-days", "last-30-days", "all-time"].includes(query.period as string)
    ? query.period
    : "this-week") as Period;

  try {
    const { start, prevStart, prevEnd } = getDateRanges(period);

    const periodConditions = [eq(users.workspaceId, workspaceId)];
    if (start) periodConditions.push(gte(feedback.createdAt, start));

    const [feedbackResult] = await db
      .select({ count: sql<number>`count(${feedback.id})::int` })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(...periodConditions));

    let previousPeriodCount = 0;
    if (prevStart && prevEnd) {
      const [prevResult] = await db
        .select({ count: sql<number>`count(${feedback.id})::int` })
        .from(feedback)
        .innerJoin(users, eq(feedback.reviewerId, users.id))
        .where(and(eq(users.workspaceId, workspaceId), gte(feedback.createdAt, prevStart), lt(feedback.createdAt, prevEnd)));
      previousPeriodCount = prevResult?.count ?? 0;
    }

    const [contributorResult] = await db
      .select({ count: sql<number>`count(distinct ${feedback.reviewerId})::int` })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(...periodConditions));

    const [userCountResult] = await db
      .select({ count: sql<number>`count(${users.id})::int` })
      .from(users)
      .where(and(eq(users.workspaceId, workspaceId), eq(users.emailVerified, true)));

    const [pairsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(
        db.selectDistinct({ reviewerId: feedback.reviewerId, revieweeId: feedback.revieweeId })
          .from(feedback)
          .innerJoin(users, eq(feedback.reviewerId, users.id))
          .where(and(...periodConditions))
          .as("pairs"),
      );

    const periodFeedback = await db
      .select({ reviewerId: feedback.reviewerId, revieweeId: feedback.revieweeId })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(...periodConditions));

    const connectionCounts = new Map<string, Set<string>>();
    for (const f of periodFeedback) {
      if (!connectionCounts.has(f.reviewerId)) connectionCounts.set(f.reviewerId, new Set());
      connectionCounts.get(f.reviewerId)!.add(f.revieweeId);
      if (!connectionCounts.has(f.revieweeId)) connectionCounts.set(f.revieweeId, new Set());
      connectionCounts.get(f.revieweeId)!.add(f.reviewerId);
    }

    let mostConnectedId: string | null = null;
    let mostConnectedCount = 0;
    for (const [uid, counterparts] of connectionCounts) {
      if (counterparts.size > mostConnectedCount) {
        mostConnectedCount = counterparts.size;
        mostConnectedId = uid;
      }
    }

    let mostConnected: { name: string; avatarUrl: string | null; connectionCount: number } | null = null;
    if (mostConnectedId) {
      const [user] = await db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, mostConnectedId));
      if (user) mostConnected = { ...user, connectionCount: mostConnectedCount };
    }

    const allFeedback = await db
      .select({ reviewerId: feedback.reviewerId, weekYear: feedback.weekYear })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(eq(users.workspaceId, workspaceId));

    const userWeeks = new Map<string, string[]>();
    for (const f of allFeedback) {
      if (f.weekYear) {
        const weeks = userWeeks.get(f.reviewerId) || [];
        weeks.push(f.weekYear);
        userWeeks.set(f.reviewerId, weeks);
      }
    }

    let longestStreak = 0;
    let streakHolderId: string | null = null;
    for (const [uid, weeks] of userWeeks) {
      const streak = computeStreak(weeks);
      if (streak > longestStreak) {
        longestStreak = streak;
        streakHolderId = uid;
      }
    }

    let streakHolder: { name: string; avatarUrl: string | null } | null = null;
    if (streakHolderId) {
      const [holder] = await db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, streakHolderId));
      if (holder) streakHolder = holder;
    }

    const feedbackSubmitted = feedbackResult?.count ?? 0;

    return validateResponse(
      {
        feedbackSubmitted,
        previousPeriodCount,
        periodChange: feedbackSubmitted - previousPeriodCount,
        participationRate: { active: contributorResult?.count ?? 0, total: userCountResult?.count ?? 0 },
        uniquePairs: pairsResult?.count ?? 0,
        longestActiveStreak: longestStreak,
        streakHolder,
        mostConnected,
      },
      apiSchemas.GetActivitySummaryResponseSchema,
    );
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error("Error computing activity summary:", error);
    throw createError({ statusCode: 500, message: "Failed to compute activity summary" });
  }
});
