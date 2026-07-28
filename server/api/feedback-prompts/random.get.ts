import { db } from "#server/database/connection";
import { feedbackPrompts } from "#server/database/schema";
import { eq, sql } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  requireUser(event);

  try {
    // Get a random active feedback prompt
    const [randomPrompt] = await db
      .select({
        id: feedbackPrompts.id,
        question: feedbackPrompts.question,
        category: feedbackPrompts.category,
      })
      .from(feedbackPrompts)
      .where(eq(feedbackPrompts.isActive, true))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (!randomPrompt) {
      throw createError({
        statusCode: 404,
        message: "No active feedback prompts found",
      });
    }

    return validateResponse(
      { prompt: randomPrompt },
      apiSchemas.GetRandomFeedbackPromptResponseSchema
    );
  } catch (error) {
    console.error("Error fetching random prompt:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback prompt",
    });
  }
});
