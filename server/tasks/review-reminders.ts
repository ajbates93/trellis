import { db } from "../database/connection";
import { reviewSchedules, users } from "../database/schema";
import { eq, and, between } from "drizzle-orm";
import { sendEmail, emailTemplates } from "../utils/email";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default defineTask({
  meta: {
    name: "review-reminders",
    description: "Send email reminders for upcoming scheduled reviews",
  },
  async run() {
    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const now = new Date();
    let emailsSent = 0;

    try {
      // 7-day reminders: scheduledDate is 6-8 days from now
      const sevenDayStart = new Date(now);
      sevenDayStart.setDate(sevenDayStart.getDate() + 6);
      sevenDayStart.setHours(0, 0, 0, 0);

      const sevenDayEnd = new Date(now);
      sevenDayEnd.setDate(sevenDayEnd.getDate() + 8);
      sevenDayEnd.setHours(23, 59, 59, 999);

      const sevenDayReviews = await db
        .select()
        .from(reviewSchedules)
        .where(
          and(
            eq(reviewSchedules.status, "scheduled"),
            eq(reviewSchedules.reminderSent7d, false),
            between(reviewSchedules.scheduledDate, sevenDayStart.toISOString(), sevenDayEnd.toISOString())
          )
        );

      for (const review of sevenDayReviews) {
        const sent = await sendReminders(review, 7, appUrl);
        emailsSent += sent;
        if (sent > 0) {
          await db
            .update(reviewSchedules)
            .set({ reminderSent7d: true })
            .where(eq(reviewSchedules.id, review.id));
        }
      }

      // 1-day reminders: scheduledDate is tomorrow (1-2 days from now)
      const oneDayStart = new Date(now);
      oneDayStart.setDate(oneDayStart.getDate() + 1);
      oneDayStart.setHours(0, 0, 0, 0);

      const oneDayEnd = new Date(now);
      oneDayEnd.setDate(oneDayEnd.getDate() + 2);
      oneDayEnd.setHours(23, 59, 59, 999);

      const oneDayReviews = await db
        .select()
        .from(reviewSchedules)
        .where(
          and(
            eq(reviewSchedules.status, "scheduled"),
            eq(reviewSchedules.reminderSent1d, false),
            between(reviewSchedules.scheduledDate, oneDayStart.toISOString(), oneDayEnd.toISOString())
          )
        );

      for (const review of oneDayReviews) {
        const sent = await sendReminders(review, 1, appUrl);
        emailsSent += sent;
        if (sent > 0) {
          await db
            .update(reviewSchedules)
            .set({ reminderSent1d: true })
            .where(eq(reviewSchedules.id, review.id));
        }
      }

      console.log(`[review-reminders] Completed. Sent ${emailsSent} reminder emails.`);
      return { result: `Sent ${emailsSent} reminder emails` };
    } catch (error) {
      console.error("[review-reminders] Task failed:", error);
      return { result: `Task failed: ${error}` };
    }
  },
});

async function sendReminders(
  review: typeof reviewSchedules.$inferSelect,
  daysUntil: number,
  appUrl: string
): Promise<number> {
  let sent = 0;
  const reviewDate = new Date(review.scheduledDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Look up reviewee and buddy
  const [reviewee] = await db
    .select()
    .from(users)
    .where(eq(users.id, review.userId));

  const [buddy] = await db
    .select()
    .from(users)
    .where(eq(users.id, review.buddyId));

  if (!reviewee || !buddy) {
    console.warn(`[review-reminders] Missing user data for review ${review.id}`);
    return 0;
  }

  // Send to reviewee if they have email notifications enabled
  if (reviewee.emailNotifications !== false) {
    try {
      await sendEmail({
        to: reviewee.email,
        subject: `Review reminder: tomorrow with ${buddy.name}`,
        html: emailTemplates.reviewReminder(
          reviewee.name,
          buddy.name,
          reviewDate,
          daysUntil,
          appUrl
        ),
      });
      sent++;
    } catch (error) {
      console.error(`[review-reminders] Failed to email reviewee ${reviewee.email}:`, error);
    }
  }

  // Delay to respect Resend rate limit (2 req/s)
  await sleep(600);

  // Send to buddy if they have email notifications enabled
  if (buddy.emailNotifications !== false) {
    try {
      await sendEmail({
        to: buddy.email,
        subject: `Review reminder: tomorrow with ${reviewee.name}`,
        html: emailTemplates.reviewReminderBuddy(
          buddy.name,
          reviewee.name,
          reviewDate,
          daysUntil,
          appUrl
        ),
      });
      sent++;
    } catch (error) {
      console.error(`[review-reminders] Failed to email buddy ${buddy.email}:`, error);
    }
  }

  return sent;
}
