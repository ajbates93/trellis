import { db } from "#server/database/connection";
import { reviewSchedules, users, reviewTemplates } from "#server/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { buildSnapshot, DEFAULT_TEMPLATE_FIELDS } from "#server/utils/reviewTemplates";
import { createNotification } from "#server/utils/inAppNotifications";
import { shouldEmail } from "#server/utils/emailPreferences";
import { sendEmail, emailTemplates } from "#server/utils/email";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const body = await validateBody(event, apiSchemas.CreateReviewScheduleRequestSchema);
    const { userId, scheduledDate, name, notes, templateId } = body;

    // Validate cannot create review for yourself
    if (userId === user.id) {
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

    if (targetUser.buddyId !== user.id) {
      throw createError({
        statusCode: 403,
        message: "You can only create reviews for users you are a buddy of",
      });
    }

    // Client sends UTC timestamp already (e.g., "2026-05-29T09:00:00.000Z")
    const selectedDate = new Date(scheduledDate);

    // Auto-generate name if not provided
    const reviewName = name || format(selectedDate, "MMMM yyyy");

    // Resolve the reflection field snapshot for this review.
    // Default to the built-in fields (validated/copied via buildSnapshot for consistency).
    let templateSnapshot = buildSnapshot(DEFAULT_TEMPLATE_FIELDS);
    let resolvedTemplateId: string | null = null;

    // Non-throwing workspace read: review creation must not start 403-ing
    // callers that lack workspace context (it had no workspace dependency before).
    const callerWorkspaceId = event.context.user?.workspaceId ?? null;

    if (templateId) {
      const conditions = [
        eq(reviewTemplates.id, templateId),
        isNull(reviewTemplates.archivedAt),
      ];
      // Scope to the caller's workspace when we know it (tenant isolation).
      if (callerWorkspaceId) {
        conditions.push(eq(reviewTemplates.workspaceId, callerWorkspaceId));
      }
      const [tpl] = await db
        .select()
        .from(reviewTemplates)
        .where(and(...conditions))
        .limit(1);
      if (!tpl) {
        throw createError({ statusCode: 404, message: "Review template not found" });
      }
      templateSnapshot = buildSnapshot(tpl.fields);
      resolvedTemplateId = tpl.id;
    } else if (callerWorkspaceId) {
      // Fall back to the caller's workspace default template if one exists.
      const [def] = await db
        .select()
        .from(reviewTemplates)
        .where(
          and(
            eq(reviewTemplates.workspaceId, callerWorkspaceId),
            eq(reviewTemplates.isDefault, true),
            isNull(reviewTemplates.archivedAt),
          ),
        )
        .limit(1);
      if (def) {
        templateSnapshot = buildSnapshot(def.fields);
        resolvedTemplateId = def.id;
      }
    }

    // Store as-is (already in UTC format from client)
    // Create the review
    const [newReview] = await db
      .insert(reviewSchedules)
      .values({
        userId,
        buddyId: user.id,
        scheduledDate: scheduledDate,
        name: reviewName,
        notes: notes || null,
        status: "scheduled",
        templateId: resolvedTemplateId,
        templateSnapshot,
        answers: {},
      })
      .returning();

    // Notify the reviewee (in-app always; email if opted in)
    try {
      const [reviewee] = await db
        .select({ name: users.name, preferredName: users.preferredName, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const [buddy] = await db
        .select({ name: users.name, preferredName: users.preferredName })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (reviewee && buddy && newReview) {
        const revieweeName = reviewee.preferredName || reviewee.name;
        const buddyName = buddy.preferredName || buddy.name;
        const dateStr = format(selectedDate, "EEEE d MMMM yyyy");
        const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

        await createNotification({
          userId,
          type: "review_created",
          title: `${buddyName} scheduled a review with you`,
          body: dateStr,
          link: `/reviews/${newReview.id}`,
          metadata: { reviewId: newReview.id, actorId: user.id },
        });

        if (await shouldEmail(userId, "review_created")) {
          await sendEmail({
            to: reviewee.email,
            subject: `New review scheduled with ${buddyName}`,
            html: emailTemplates.reviewCreated(revieweeName, buddyName, dateStr, appUrl),
          });
        }
      }
    } catch (notifyErr) {
      console.error("Failed to send review_created notifications:", notifyErr);
    }

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
