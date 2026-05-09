import { db } from "#server/database/connection";
import { reviewSchedules, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
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

  const body = await validateBody(event, apiSchemas.CompleteReviewRequestSchema);
  const { completionNotes } = body;

  try {
    // Get the review
    const [review] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, reviewId))
      .limit(1);

    if (!review) {
      throw createError({
        statusCode: 404,
        message: "Review not found",
      });
    }

    // AUTHORIZATION CHECK: Only buddy or admin can complete the review
    const isBuddy = review.buddyId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only the buddy or admin can complete this review",
      });
    }

    // Update review to completed
    // Store current datetime in UTC
    const now = new Date();
    const completedDateUTC = now.toISOString();

    const [updated] = await db
      .update(reviewSchedules)
      .set({
        status: 'completed',
        completedDate: completedDateUTC,
        completionNotes: completionNotes || null,
      })
      .where(eq(reviewSchedules.id, reviewId))
      .returning();

    // Emit completion notification + email to the reviewee
    try {
      const [recipient] = await db
        .select({ name: users.name, preferredName: users.preferredName, email: users.email })
        .from(users)
        .where(eq(users.id, review.userId))
        .limit(1);

      const [actor] = await db
        .select({ name: users.name, preferredName: users.preferredName })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (recipient && actor) {
        const recipientName = recipient.preferredName || recipient.name;
        const actorName = actor.preferredName || actor.name;
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId: review.userId,
          type: "review_completed",
          title: `${actorName} marked your review complete`,
          link: `/reviews/${reviewId}`,
          metadata: { reviewId, actorId: session.user.id },
        });

        if (await shouldEmail(review.userId, "review_completed")) {
          await sendEmail({
            to: recipient.email,
            subject: `Review completed by ${actorName}`,
            html: emailTemplates.reviewCompleted(recipientName, actorName, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_completed notifications:", notifyErr);
    }

    return validateResponse(
      { success: true, review: updated },
      apiSchemas.UpdateReviewScheduleResponseSchema
    );
  } catch (error: unknown) {
    console.error("Error completing review:", error);
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to complete review",
    });
  }
});
