import { db } from "../../../database/connection";
import { feedback, users, feedbackInsights } from "../../../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { analyzeFeedback } from "../../../services/anthropicClient";
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
    // Verify the user exists and get their name
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

    const userName = targetUser[0]?.name || "the employee";

    // Admin bypass: No 24-hour rate limiting for admins
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
        message: `Not enough feedback to analyze. ${userName} needs at least 3 pieces of published feedback, but only has ${validFeedback.length}.`,
      });
    }

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
          }))
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
        message: `Feedback analyzed successfully for ${userName}`,
        userName,
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
    console.error("Error analyzing feedback for admin:", error);

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
