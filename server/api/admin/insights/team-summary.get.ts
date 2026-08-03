import { db } from "#server/database/connection";
import { feedbackInsights, users } from "#server/database/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import { requireAdmin } from "#server/utils/auth-guards";

interface SentimentData {
  positive: number;
  constructive: number;
  neutral: number;
}

interface UserSentimentSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  roleType: string | null;
  currentSentiment: SentimentData | null;
  dominantSentiment: "positive" | "constructive" | "neutral" | "none";
  trend: "improving" | "declining" | "stable" | "new";
  lastAnalyzed: Date | null;
  feedbackCount: number;
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  try {
    const workspaceId = getWorkspaceId(event);

    // Get all users in the caller's workspace
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.workspaceId, workspaceId));

    // Get the two most recent analyses for each user (for trend comparison),
    // fetched in a single batched query instead of one query per user.
    const userIds = allUsers.map((u) => u.id);
    const allInsights = userIds.length
      ? await db
          .select({
            userId: feedbackInsights.userId,
            sentimentData: feedbackInsights.sentimentData,
            analysisDate: feedbackInsights.analysisDate,
            feedbackCount: feedbackInsights.feedbackCount,
          })
          .from(feedbackInsights)
          .where(inArray(feedbackInsights.userId, userIds))
          .orderBy(desc(feedbackInsights.analysisDate))
      : [];

    const insightsByUser = new Map<string, typeof allInsights>();
    for (const row of allInsights) {
      const list = insightsByUser.get(row.userId) ?? [];
      if (list.length < 2) list.push(row);
      insightsByUser.set(row.userId, list);
    }

    const userSummaries: UserSentimentSummary[] = [];
    let totalPositive = 0;
    let totalConstructive = 0;
    let totalNeutral = 0;
    let usersWithAnalysis = 0;

    for (const user of allUsers) {
      // Get the two most recent analyses for this user
      const recentAnalyses = insightsByUser.get(user.id) ?? [];

      const latestAnalysis = recentAnalyses[0];
      const previousAnalysis = recentAnalyses[1];

      let currentSentiment: SentimentData | null = null;
      let dominantSentiment: "positive" | "constructive" | "neutral" | "none" =
        "none";
      let trend: "improving" | "declining" | "stable" | "new" = "new";
      let feedbackCount = 0;

      if (latestAnalysis) {
        usersWithAnalysis++;
        const parsedSentiment: SentimentData = JSON.parse(latestAnalysis.sentimentData);
        currentSentiment = parsedSentiment;
        feedbackCount = latestAnalysis.feedbackCount;

        // Add to totals for aggregate calculation
        totalPositive += parsedSentiment.positive;
        totalConstructive += parsedSentiment.constructive;
        totalNeutral += parsedSentiment.neutral;

        // Determine dominant sentiment
        if (
          parsedSentiment.positive >= parsedSentiment.constructive &&
          parsedSentiment.positive >= parsedSentiment.neutral
        ) {
          dominantSentiment = "positive";
        } else if (
          parsedSentiment.constructive >= parsedSentiment.positive &&
          parsedSentiment.constructive >= parsedSentiment.neutral
        ) {
          dominantSentiment = "constructive";
        } else {
          dominantSentiment = "neutral";
        }

        // Calculate trend if we have a previous analysis
        if (previousAnalysis) {
          const previousSentiment: SentimentData = JSON.parse(
            previousAnalysis.sentimentData
          );

          // Compare positive sentiment percentage to determine trend
          const positiveDiff =
            parsedSentiment.positive - previousSentiment.positive;

          // Consider >5% change as significant
          if (positiveDiff > 5) {
            trend = "improving";
          } else if (positiveDiff < -5) {
            trend = "declining";
          } else {
            trend = "stable";
          }
        }
      }

      userSummaries.push({
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatarUrl || user.image,
        roleType: user.roleType,
        currentSentiment,
        dominantSentiment,
        trend,
        lastAnalyzed: latestAnalysis?.analysisDate || null,
        feedbackCount,
      });
    }

    // Calculate aggregate sentiment (average across all users with analysis)
    let aggregateSentiment: SentimentData | null = null;

    if (usersWithAnalysis > 0) {
      // Calculate raw averages
      const rawPositive = totalPositive / usersWithAnalysis;
      const rawConstructive = totalConstructive / usersWithAnalysis;
      const rawNeutral = totalNeutral / usersWithAnalysis;

      // Round each value
      let positive = Math.round(rawPositive);
      let constructive = Math.round(rawConstructive);
      let neutral = Math.round(rawNeutral);

      // Normalize to ensure they sum to exactly 100%
      const total = positive + constructive + neutral;

      if (total !== 100) {
        // Calculate remainders to determine which value to adjust
        const remainders = [
          { category: 'positive', remainder: rawPositive - Math.floor(rawPositive), value: positive },
          { category: 'constructive', remainder: rawConstructive - Math.floor(rawConstructive), value: constructive },
          { category: 'neutral', remainder: rawNeutral - Math.floor(rawNeutral), value: neutral },
        ];

        // Sort by remainder (largest remainder gets priority for adjustment)
        remainders.sort((a, b) => b.remainder - a.remainder);

        // Adjust the value with the largest remainder
        const difference = 100 - total;

        // remainders always has 3 entries, so the first element is defined
        const largestRemainder = remainders[0]!;

        if (largestRemainder.category === 'positive') {
          positive += difference;
        } else if (largestRemainder.category === 'constructive') {
          constructive += difference;
        } else {
          neutral += difference;
        }
      }

      aggregateSentiment = { positive, constructive, neutral };
    }

    // Sort users: those with analysis first, then by last analyzed date
    userSummaries.sort((a, b) => {
      // Users with analysis come first
      if (a.lastAnalyzed && !b.lastAnalyzed) return -1;
      if (!a.lastAnalyzed && b.lastAnalyzed) return 1;

      // Among users with analysis, sort by most recent
      if (a.lastAnalyzed && b.lastAnalyzed) {
        return (
          new Date(b.lastAnalyzed).getTime() -
          new Date(a.lastAnalyzed).getTime()
        );
      }

      // Sort remaining by name
      return a.userName.localeCompare(b.userName);
    });

    return validateResponse(
      {
        totalUsers: allUsers.length,
        usersWithAnalysis,
        usersWithoutAnalysis: allUsers.length - usersWithAnalysis,
        aggregateSentiment,
        users: userSummaries,
      },
      apiSchemas.GetTeamSentimentSummaryResponseSchema
    );
  } catch (error: any) {
    console.error("Error fetching team sentiment summary:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch team sentiment summary",
    });
  }
});
