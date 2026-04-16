import { db } from "#server/database/connection";
import { reviewSchedules, feedback } from "#server/database/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Find the next scheduled review for a user after a given date
 *
 * @param userId - The user being reviewed (reviewee)
 * @param afterDate - Find reviews scheduled on or after this date
 * @returns The next review, or null if none found
 */
export async function findNextReview(userId: string, afterDate: Date) {
  const dateStr = afterDate.toISOString().split('T')[0];

  const [nextReview] = await db
    .select()
    .from(reviewSchedules)
    .where(
      and(
        eq(reviewSchedules.userId, userId),
        gte(reviewSchedules.scheduledDate, dateStr)
      )
    )
    .orderBy(reviewSchedules.scheduledDate)
    .limit(1);

  return nextReview || null;
}

/**
 * Assign feedback to the appropriate review
 *
 * @param feedbackId - The feedback item ID
 * @param revieweeId - The user who received the feedback
 * @param createdAt - When the feedback was created
 * @returns The review_schedule_id that was assigned, or null
 */
// export async function assignFeedbackToReview(
//   feedbackId: string,
//   revieweeId: string,
//   createdAt: Date
// ): Promise<string | null> {
//   const nextReview = await findNextReview(revieweeId, createdAt);

//   if (!nextReview) {
//     console.log(`No review found for feedback ${feedbackId.substring(0, 8)}... (reviewee: ${revieweeId.substring(0, 8)}...)`);
//     return null;
//   }

//   // Update feedback with review assignment
//   await db
//     .update(feedback)
//     .set({ reviewScheduleId: nextReview.id })
//     .where(eq(feedback.id, feedbackId));

//   console.log(`✓ Assigned feedback ${feedbackId.substring(0, 8)}... to review "${nextReview.name}"`);

//   return nextReview.id;
// }
