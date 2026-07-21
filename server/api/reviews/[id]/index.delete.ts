import { db } from "#server/database/connection";
import { reviewSchedules, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
import { sendEmail, emailTemplates } from "#server/utils/email";
import { assertSameWorkspace } from "#server/utils/workspace";

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

    // AUTHORIZATION CHECK: Only the buddy or admins can delete reviews
    const isBuddy = existingReview.buddyId === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to delete this review",
      });
    }

    // An admin deleting someone else's review may only do so within their own
    // workspace.
    if (isAdmin && !isBuddy) {
      await assertSameWorkspace(event, existingReview.userId);
    }

    // Emit cancellation notification + email to the OTHER party
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

      if (recipient && actor) {
        const recipientName = recipient.preferredName || recipient.name;
        const actorName = actor.preferredName || actor.name;
        const dateStr = format(new Date(existingReview.scheduledDate), "EEEE d MMMM yyyy");
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId: recipientId,
          type: "review_cancelled",
          title: `${actorName} cancelled your review`,
          body: dateStr,
          link: "/reviews",
          metadata: { reviewId, actorId: session.user.id },
        });

        if (await shouldEmail(recipientId, "review_cancelled")) {
          await sendEmail({
            to: recipient.email,
            subject: `Review cancelled by ${actorName}`,
            html: emailTemplates.reviewCancelled(recipientName, actorName, dateStr, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_cancelled notifications:", notifyErr);
    }

    // Delete the review
    await db.delete(reviewSchedules).where(eq(reviewSchedules.id, reviewId));

    return {
      success: true,
      message: "Review deleted successfully",
    };
  } catch (error: any) {
    console.error("Error deleting review:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to delete review",
    });
  }
});
