import { db } from "../../../database/connection";
import { feedbackInsights, users } from "../../../database/schema";
import { eq, desc, sql } from "drizzle-orm";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

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
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Admin access required",
    });
  }

  try {
    // Get all users
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        image: users.image,
        roleType: users.roleType,
      })
      .from(users);

    // Get the two most recent analyses for each user (for trend comparison)
    const userSummaries: UserSentimentSummary[] = [];
    let totalPositive = 0;
    let totalConstructive = 0;
    let totalNeutral = 0;
    let usersWithAnalysis = 0;

    for (const user of allUsers) {
      // Get the two most recent analyses for this user
      const recentAnalyses = await db
        .select({
          sentimentData: feedbackInsights.sentimentData,
          analysisDate: feedbackInsights.analysisDate,
          feedbackCount: feedbackInsights.feedbackCount,
        })
        .from(feedbackInsights)
        .where(eq(feedbackInsights.userId, user.id))
        .orderBy(desc(feedbackInsights.analysisDate))
        .limit(2);

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
    const aggregateSentiment: SentimentData | null =
      usersWithAnalysis > 0
        ? {
            positive: Math.round(totalPositive / usersWithAnalysis),
            constructive: Math.round(totalConstructive / usersWithAnalysis),
            neutral: Math.round(totalNeutral / usersWithAnalysis),
          }
        : null;

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
