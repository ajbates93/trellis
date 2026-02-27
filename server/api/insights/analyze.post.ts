import { db } from "../../database/connection";
import { feedback, users, feedbackInsights } from "../../database/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { analyzeFeedback } from "../../services/anthropicClient";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const userId = session.user.id;

    // Check if user has analyzed in the last 24 hours (rate limiting)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentAnalysis = await db
      .select()
      .from(feedbackInsights)
      .where(
        and(
          eq(feedbackInsights.userId, userId),
          gte(feedbackInsights.analysisDate, oneDayAgo),
        ),
      )
      .orderBy(desc(feedbackInsights.analysisDate))
      .limit(1);

    if (recentAnalysis.length > 0) {
      // Return cached analysis if recent
      const cached = recentAnalysis[0];
      if (!cached) {
        throw createError({
          statusCode: 500,
          message: "Failed to retrieve recent analysis",
        });
      }

      return validateResponse(
        {
          status: "cached",
          message: "Analysis from last 24 hours returned",
          lastAnalyzed: cached.analysisDate,
          data: {
            sentimentData: JSON.parse(cached.sentimentData),
            themes: JSON.parse(cached.themes),
            suggestedGoals: cached.suggestedGoals
              ? JSON.parse(cached.suggestedGoals)
              : [],
            feedbackCount: cached.feedbackCount,
          },
        },
        apiSchemas.AnalyzeInsightsResponseSchema
      );
    }

    // Fetch user's published feedback for analysis
    const receivedFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        reviewer: {
          name: users.name,
        },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(and(eq(feedback.revieweeId, userId), eq(feedback.published, true)))
      .orderBy(desc(feedback.createdAt));

    // Filter out feedback with null createdAt and map to proper type
    const validFeedback = receivedFeedback
      .filter((f) => f.createdAt !== null)
      .map((f) => ({
        ...f,
        createdAt: f.createdAt as Date,
      }));

    // Check if user has enough feedback to analyze
    if (validFeedback.length < 3) {
      throw createError({
        statusCode: 400,
        message: `Not enough feedback to analyze. You need at least 3 pieces of feedback, but only have ${validFeedback.length}.`,
      });
    }

    // Get user name for context
    const user = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = user[0]?.name || "the employee";

    // Analyze feedback using Claude
    const analysisResult = await analyzeFeedback(validFeedback, userName);

    // Store the analysis in the database
    const feedbackIds = validFeedback.map((f) => f.id);

    const result = await db
      .insert(feedbackInsights)
      .values({
        userId,
        analysisDate: new Date(),
        feedbackCount: validFeedback.length,
        feedbackIds: JSON.stringify(feedbackIds),
        sentimentData: JSON.stringify(analysisResult.sentimentData),
        themes: JSON.stringify(analysisResult.themes),
        suggestedGoals: JSON.stringify(
          analysisResult.suggestedGoals.map((goal) => ({
            ...goal,
            dismissed: false,
            actedUpon: false,
          })),
        ),
        llmModel: "claude-haiku-4-5-20251001",
        status: "completed",
      })
      .returning();

    const insertedInsight = result[0];
    if (!insertedInsight) {
      throw createError({
        statusCode: 500,
        message: "Failed to store analysis",
      });
    }

    // Update user's lastInsightsDate
    await db
      .update(users)
      .set({ lastInsightsDate: new Date() })
      .where(eq(users.id, userId));

    return validateResponse(
      {
        status: "completed",
        message: "Feedback analyzed successfully",
        lastAnalyzed: insertedInsight.analysisDate,
        data: {
          sentimentData: analysisResult.sentimentData,
          themes: analysisResult.themes,
          suggestedGoals: analysisResult.suggestedGoals.map((goal) => ({
            ...goal,
            dismissed: false,
            actedUpon: false,
          })),
          feedbackCount: validFeedback.length,
        },
      },
      apiSchemas.AnalyzeInsightsResponseSchema
    );
  } catch (error: any) {
    console.error("Error analyzing feedback:", error);

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise create a generic 500 error
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to analyze feedback",
    });
  }
});
