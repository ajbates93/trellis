import { db } from "../../../database/connection";
import { feedbackInsights, feedback, users } from "../../../database/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

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

  const userId = getRouterParam(event, "userId");

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  try {
    // Verify the user exists
    const targetUser = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (targetUser.length === 0) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Get the most recent completed analysis for the user
    const latestAnalysis = await db
      .select()
      .from(feedbackInsights)
      .where(
        and(
          eq(feedbackInsights.userId, userId),
          eq(feedbackInsights.status, "completed")
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
          userName: targetUser[0]?.name,
          message:
            'No analysis available for this user. Click "Analyze Now" to generate insights.',
          data: null,
        },
        apiSchemas.GetUserInsightsSummaryResponseSchema
      );
    }

    // Count new feedback since last analysis
    const analysisDate = analysis.analysisDate;
    if (!analysisDate) {
      return validateResponse(
        {
          hasAnalysis: false,
          userName: targetUser[0]?.name,
          message: "No valid analysis available.",
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
        userName: targetUser[0]?.name,
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
  } catch (error: any) {
    console.error("Error fetching admin feedback insights:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback insights",
    });
  }
});
