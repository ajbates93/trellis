import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail, emailTemplates } from "./email";
import { shouldEmail } from "./emailPreferences";
import { createNotification } from "./inAppNotifications";

/**
 * Notify a reviewee's buddy that new feedback has been submitted.
 * In-app notification + (if buddy opts in) email. Fire-and-forget.
 */
export async function notifyBuddyOfNewFeedback(revieweeId: string) {
  try {
    const [reviewee] = await db
      .select({
        name: users.name,
        preferredName: users.preferredName,
        buddyId: users.buddyId,
      })
      .from(users)
      .where(eq(users.id, revieweeId))
      .limit(1);

    if (!reviewee?.buddyId) return;

    const [buddy] = await db
      .select({
        name: users.name,
        preferredName: users.preferredName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, reviewee.buddyId))
      .limit(1);

    if (!buddy) return;

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const buddyName = buddy.preferredName || buddy.name;
    const revieweeName = reviewee.preferredName || reviewee.name;

    // In-app notification (always)
    await createNotification({
      userId: reviewee.buddyId,
      type: "buddy_feedback_received",
      title: `New feedback for ${revieweeName} to review`,
      link: "/feedback/inbox",
      metadata: { revieweeId },
    });

    // Email (per preference)
    if (await shouldEmail(reviewee.buddyId, "buddy_feedback_received")) {
      await sendEmail({
        to: buddy.email,
        subject: "New feedback to review on Trellis",
        html: emailTemplates.buddyFeedbackReceived(buddyName, revieweeName, appUrl),
      });
    }
  } catch (error) {
    console.error("Failed to send buddy notification email:", error);
  }
}

// Debounce state for published feedback notifications.
const DEBOUNCE_MS = 5000;
const pendingRevieweeIds = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPublishedFeedbackNotifications() {
  const ids = [...pendingRevieweeIds];
  pendingRevieweeIds.clear();
  debounceTimer = null;

  if (ids.length === 0) return;

  try {
    const reviewees = await db
      .select({
        id: users.id,
        name: users.name,
        preferredName: users.preferredName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, ids));

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

    for (const reviewee of reviewees) {
      const revieweeName = reviewee.preferredName || reviewee.name;

      // In-app notification
      await createNotification({
        userId: reviewee.id,
        type: "feedback_received",
        title: "You have new feedback",
        link: "/feedback/inbox",
        metadata: { revieweeId: reviewee.id },
      });

      // Email
      if (await shouldEmail(reviewee.id, "feedback_received")) {
        sendEmail({
          to: reviewee.email,
          subject: "You have new feedback on Trellis",
          html: emailTemplates.feedbackPublished(revieweeName, appUrl),
        }).catch((error) => {
          console.error(`Failed to send published feedback email to ${reviewee.email}:`, error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to send published feedback notification emails:", error);
  }
}

/**
 * Notify reviewees that their feedback has been published.
 * 5-second debounce so rapid individual publishes for the same reviewee
 * only result in a single email.
 */
export function notifyRevieweeOfPublishedFeedback(revieweeIds: string[]) {
  for (const id of revieweeIds) {
    pendingRevieweeIds.add(id);
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    flushPublishedFeedbackNotifications();
  }, DEBOUNCE_MS);
}
