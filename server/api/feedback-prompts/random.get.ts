import { db } from "../../database/connection";
import { feedbackPrompts } from "../../database/schema";
import { eq, sql } from "drizzle-orm";
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
