import { db } from "../../database/connection";
import { reviewSchedules, users } from "../../database/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { validateBody, validateResponse } from "../../utils/validation";
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
    const body = await validateBody(event, apiSchemas.CreateReviewScheduleRequestSchema);
    const { userId, scheduledDate, name, notes } = body;

    // Validate cannot create review for yourself
    if (userId === session.user.id) {
      throw createError({
        statusCode: 400,
        message: "You cannot create a review for yourself",
      });
    }

    // Validate that the user is a buddy of the current user
    const [targetUser] = await db
      .select({ buddyId: users.buddyId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    if (targetUser.buddyId !== session.user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only create reviews for users you are a buddy of",
      });
    }

    // Client sends UTC timestamp already (e.g., "2026-05-29T09:00:00.000Z")
    const selectedDate = new Date(scheduledDate);

    // Auto-generate name if not provided
    const reviewName = name || format(selectedDate, "MMMM yyyy");

    // Store as-is (already in UTC format from client)
    // Create the review
    const [newReview] = await db
      .insert(reviewSchedules)
      .values({
        userId,
        buddyId: session.user.id,
        scheduledDate: scheduledDate,
        name: reviewName,
        notes: notes || null,
        status: "scheduled",
      })
      .returning();

    return validateResponse(
      { success: true, review: newReview },
      apiSchemas.SuccessResponseSchema.passthrough()
    );
  } catch (error) {
    console.error("Error creating review:", error);

    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to create review",
    });
  }
});
