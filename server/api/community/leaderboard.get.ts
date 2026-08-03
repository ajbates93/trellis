import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq, and, gte } from "drizzle-orm";
import { subWeeks } from "date-fns";
import { validateResponse } from "#server/utils/validation";
import { getWorkspaceId } from "#server/utils/workspace";
import {
  computeStreak,
  computeVariety,
  computeRegularity,
  computeTotalScore,
  getWeeksInRange,
  type WeekFeedback,
} from "#server/utils/community-scoring";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

const VALID_PERIODS = ["4weeks", "12weeks", "alltime"] as const;
type Period = (typeof VALID_PERIODS)[number];

function getPeriodCutoff(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "4weeks":
      return subWeeks(now, 4);
    case "12weeks":
      return subWeeks(now, 12);
    case "alltime":
      return null;
  }
}

export default defineEventHandler(async (event) => {
  requireUser(event);

  const workspaceId = getWorkspaceId(event);
  const query = getQuery(event);
  const period = (VALID_PERIODS.includes(query.period as Period)
    ? query.period
    : "12weeks") as Period;
  const cutoff = getPeriodCutoff(period);

  try {
    // Get all feedback entries within the period for workspace users
    const conditions = [eq(users.workspaceId, workspaceId)];
    if (cutoff) {
      conditions.push(gte(feedback.createdAt, cutoff));
    }

    const feedbackRows = await db
      .select({
        reviewerId: feedback.reviewerId,
        revieweeId: feedback.revieweeId,
        weekYear: feedback.weekYear,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(...conditions));

    // Get all workspace users
    const workspaceUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        image: users.image,
        roleType: users.roleType,
      })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          eq(users.emailVerified, true),
        ),
      );

    // Determine the full set of weeks in this period for regularity calculation
    const periodStart = cutoff || new Date(0);
    const periodEnd = new Date();
    const allWeeksInPeriod = getWeeksInRange(periodStart, periodEnd);

    // Build leaderboard entries
    const entries = workspaceUsers.map((user) => {
      const userFeedback = feedbackRows.filter(
        (f) => f.reviewerId === user.id,
      );

      // Streak: consecutive weeks with feedback
      const weekYears = userFeedback
        .map((f) => f.weekYear)
        .filter((w): w is string => w !== null);
      const streakWeeks = computeStreak(weekYears);

      // Variety: unique recipients
      const varietyCount = computeVariety(
        feedbackRows as WeekFeedback[],
        user.id,
      );

      // Regularity: build weekly counts including zero-activity weeks
      const weekCounts = new Map<string, number>();
      for (const week of allWeeksInPeriod) {
        weekCounts.set(week, 0);
      }
      for (const f of userFeedback) {
        if (f.weekYear) {
          weekCounts.set(f.weekYear, (weekCounts.get(f.weekYear) || 0) + 1);
        }
      }
      const regularityScore = computeRegularity([...weekCounts.values()]);

      const totalScore = computeTotalScore(
        streakWeeks,
        varietyCount,
        regularityScore,
      );

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        image: user.image,
        roleType: user.roleType,
        streakWeeks,
        varietyCount,
        regularityScore,
        totalScore,
      };
    });

    // Sort by total score descending
    const leaderboard = entries
      .sort((a, b) => b.totalScore - a.totalScore);

    return validateResponse(
      { leaderboard, period },
      apiSchemas.GetCommunityLeaderboardResponseSchema,
    );
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error("Error computing leaderboard:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to compute leaderboard",
    });
  }
});
