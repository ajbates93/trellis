import { db } from "../../../database/connection";
import { reviewSchedules } from "../../../database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const reviewId = getRouterParam(event, "id");

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      message: "Review ID is required",
    });
  }

  const body = await readBody(event);
  const { scheduledDate, name, notes } = body;

  try {
    // Get the existing review to check authorization
    const [existingReview] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, reviewId))
      .limit(1);

    if (!existingReview) {
      throw createError({
        statusCode: 404,
        message: "Review not found",
      });
    }

    // AUTHORIZATION CHECK: Only the buddy or admins can edit reviews
    const isBuddy = existingReview.buddyId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to edit this review",
      });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the review
    const [updatedReview] = await db
      .update(reviewSchedules)
      .set(updateData)
      .where(eq(reviewSchedules.id, reviewId))
      .returning();

    return {
      success: true,
      review: updatedReview,
    };
  } catch (error) {
    console.error("Error updating review:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to update review",
    });
  }
});
