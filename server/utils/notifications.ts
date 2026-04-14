import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail, emailTemplates } from "./email";

/**
 * Notify a reviewee's buddy that new feedback has been submitted.
 * Fire-and-forget: logs errors but does not throw.
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
        emailNotifications: users.emailNotifications,
      })
      .from(users)
      .where(eq(users.id, reviewee.buddyId))
      .limit(1);

    if (!buddy || buddy.emailNotifications === false) return;

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const buddyName = buddy.preferredName || buddy.name;
    const revieweeName = reviewee.preferredName || reviewee.name;

    await sendEmail({
      to: buddy.email,
      subject: "New feedback to review on Trellis",
      html: emailTemplates.buddyFeedbackReceived(buddyName, revieweeName, appUrl),
    });
  } catch (error) {
    console.error("Failed to send buddy notification email:", error);
  }
}

// Debounce state for published feedback notifications.
// Accumulates reviewee IDs and flushes after 5 seconds of inactivity,
// so rapid individual publishes result in one email per reviewee.
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
        name: users.name,
        preferredName: users.preferredName,
        email: users.email,
        emailNotifications: users.emailNotifications,
      })
      .from(users)
      .where(inArray(users.id, ids));

    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

    for (const reviewee of reviewees) {
      if (reviewee.emailNotifications === false) continue;

      const revieweeName = reviewee.preferredName || reviewee.name;

      sendEmail({
        to: reviewee.email,
        subject: "You have new feedback on Trellis",
        html: emailTemplates.feedbackPublished(revieweeName, appUrl),
      }).catch((error) => {
        console.error(`Failed to send published feedback email to ${reviewee.email}:`, error);
      });
    }
  } catch (error) {
    console.error("Failed to send published feedback notification emails:", error);
  }
}

/**
 * Notify reviewees that their feedback has been published.
 * Uses a 5-second debounce so rapid individual publishes for the same
 * reviewee only result in a single email.
 * Fire-and-forget: logs errors but does not throw.
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
