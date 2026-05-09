import { db } from "#server/database/connection";
import { reviewSchedules, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
import { sendEmail, emailTemplates } from "#server/utils/email";

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

  const body = await validateBody(
    event,
    apiSchemas.UpdateReviewScheduleRequestSchema,
  );
  
  const { 
    scheduledDate, 
    name, 
    notes,
    reflectionLearnings,
    reflectionHighlights,
    reflectionConcerns,
    buddyComments,
    revieweeComments,
  } = body;

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

    // Reject updates on completed reviews
    if (existingReview.status === 'completed') {
      throw createError({
        statusCode: 400,
        message: "Cannot update a completed review",
      });
    }

    // AUTHORIZATION CHECK
    const isReviewee = existingReview.userId === session.user.id;
    const isBuddy = existingReview.buddyId === session.user.id;
    const isAdmin = session.user.role === "admin";

    // Must be either the reviewee, buddy, or admin
    if (!isReviewee && !isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to edit this review",
      });
    }

    // Build update object with role-based field access
    const updateData: Record<string, unknown> = {};

    // Scheduling fields: only buddy/admin can update
    if (isBuddy || isAdmin) {
      if (scheduledDate !== undefined) {
        // Client sends UTC timestamp already, store as-is
        updateData.scheduledDate = scheduledDate;
      }
      if (name !== undefined) {
        updateData.name = name;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }
    }

    // Reflection and comment fields: both buddy and reviewee can update
    if (isBuddy || isReviewee || isAdmin) {
      if (reflectionLearnings !== undefined) {
        updateData.reflectionLearnings = reflectionLearnings;
      }
      if (reflectionHighlights !== undefined) {
        updateData.reflectionHighlights = reflectionHighlights;
      }
      if (reflectionConcerns !== undefined) {
        updateData.reflectionConcerns = reflectionConcerns;
      }
      if (revieweeComments !== undefined) {
        updateData.revieweeComments = revieweeComments;
      }
      if (buddyComments !== undefined) {
        updateData.buddyComments = buddyComments;
      }
    }

    // Update the review
    const [updatedReview] = await db
      .update(reviewSchedules)
      .set(updateData)
      .where(eq(reviewSchedules.id, reviewId))
      .returning();

    // If the scheduled date actually changed AND the caller is permitted to change it,
    // emit reschedule notification + email to the OTHER party.
    const dateChanged =
      (isBuddy || isAdmin) &&
      scheduledDate !== undefined &&
      new Date(scheduledDate).getTime() !== new Date(existingReview.scheduledDate).getTime();

    if (dateChanged) {
      try {
        const recipientId =
          existingReview.userId === session.user.id
            ? existingReview.buddyId
            : existingReview.userId;

        const [recipient] = await db
          .select({ name: users.name, preferredName: users.preferredName, email: users.email })
          .from(users)
          .where(eq(users.id, recipientId))
          .limit(1);

        const [actor] = await db
          .select({ name: users.name, preferredName: users.preferredName })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);

        if (existingReview && recipient && actor) {
          const recipientName = recipient.preferredName || recipient.name;
          const actorName = actor.preferredName || actor.name;
          const dateStr = format(new Date(scheduledDate!), "EEEE d MMMM yyyy");
          const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

          await createNotification({
            userId: recipientId,
            type: "review_rescheduled",
            title: `${actorName} rescheduled your review`,
            body: dateStr,
            link: `/reviews/${reviewId}`,
            metadata: { reviewId, actorId: session.user.id },
          });

          if (await shouldEmail(recipientId, "review_rescheduled")) {
            await sendEmail({
              to: recipient.email,
              subject: `Review rescheduled by ${actorName}`,
              html: emailTemplates.reviewRescheduled(recipientName, actorName, dateStr, appUrl),
            });
          }
        }
      } catch (notifyErr) {
        console.error("Failed to send review_rescheduled notifications:", notifyErr);
      }
    }

    return validateResponse(
      {
        success: true,
        review: updatedReview,
      },
      apiSchemas.UpdateReviewScheduleResponseSchema,
    );
  } catch (error: unknown) {
    console.error("Error updating review:", error);
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to update review",
    });
  }
});
