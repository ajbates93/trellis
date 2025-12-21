import { db } from "../../database/connection";
import { feedbackInsights, feedback } from "../../database/schema";
import { eq, and, desc, gt } from "drizzle-orm";
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

    // Get the most recent completed analysis for the user
    const latestAnalysis = await db
      .select()
      .from(feedbackInsights)
      .where(
        and(
          eq(feedbackInsights.userId, userId),
          eq(feedbackInsights.status, 'completed')
        )
      )
      .orderBy(desc(feedbackInsights.analysisDate))
      .limit(1);

    const analysis = latestAnalysis[0];

    if (!analysis) {
      // No analysis exists yet
      return validateResponse(
        {
          hasAnalysis: false,
          message: 'No analysis available. Click "Analyze Now" to generate insights.',
          data: null,
        },
        apiSchemas.GetUserInsightsSummaryResponseSchema
      );
    }

    // Count new feedback since last analysis
    const analysisDate = analysis.analysisDate;
    if (!analysisDate) {
      // If analysisDate is null, return empty count
      return validateResponse(
        {
          hasAnalysis: false,
          message: 'No valid analysis available.',
          data: null,
        },
        apiSchemas.GetUserInsightsSummaryResponseSchema
      );
    }

    const newFeedbackCount = await db
      .select({ id: feedback.id })
      .from(feedback)
      .where(
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true),
          gt(feedback.createdAt, analysisDate)
        )
      );

    // Parse the stored JSON data
    const sentimentData = JSON.parse(analysis.sentimentData);
    const themes = JSON.parse(analysis.themes);
    const suggestedGoals = analysis.suggestedGoals
      ? JSON.parse(analysis.suggestedGoals)
      : [];

    return validateResponse(
      {
        hasAnalysis: true,
        lastAnalyzed: analysis.analysisDate,
        feedbackCount: analysis.feedbackCount,
        newFeedbackSinceAnalysis: newFeedbackCount.length,
        data: {
          sentimentData,
          themes,
          suggestedGoals,
        },
      },
      apiSchemas.GetUserInsightsSummaryResponseSchema
    );
  } catch (error) {
    console.error("Error fetching feedback insights:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback insights",
    });
  }
});
