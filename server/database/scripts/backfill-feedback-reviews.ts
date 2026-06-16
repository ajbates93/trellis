import "dotenv/config";
import { db } from "#server/database/connection";
import { feedback, reviewSchedules } from "#server/database/schema";
import { eq, and, gte, isNull, sql } from "drizzle-orm";

/**
 * Backfill script to assign existing published feedback to reviews
 *
 * Logic:
 * - Find all published feedback without a review_schedule_id
 * - For each feedback, find the next scheduled review for the reviewee
 *   where scheduled_date >= feedback.created_at
 * - Assign the feedback to that review
 *
 * Also sets default review names if not set.
 */
async function backfillFeedbackReviews() {
  console.log("🔄 Starting feedback-to-review backfill...\n");

  try {
    // Step 1: Set default review names if not set
    console.log("📝 Setting default review names...");
    const reviewsWithoutNames = await db
      .select()
      .from(reviewSchedules)
      .where(isNull(reviewSchedules.name));

    for (const review of reviewsWithoutNames) {
      const date = new Date(review.scheduledDate);
      const defaultName = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });

      await db
        .update(reviewSchedules)
        .set({ name: defaultName })
        .where(eq(reviewSchedules.id, review.id));

      console.log(`   ✓ Set review name: "${defaultName}" for review ${review.id.substring(0, 8)}...`);
    }

    // Step 2: Get all published feedback without review assignment
    console.log("\n📋 Finding unassigned published feedback...");
    const unassignedFeedback = await db
      .select({
        id: feedback.id,
        revieweeId: feedback.revieweeId,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.published, true),
          // review_schedule_id was dropped from the feedback table (migration
          // 0010); raw SQL keeps this legacy script compiling unchanged.
          sql`${feedback}."review_schedule_id" IS NULL`
        )
      );

    console.log(`   Found ${unassignedFeedback.length} unassigned feedback items\n`);

    if (unassignedFeedback.length === 0) {
      console.log("✅ No feedback to backfill!");
      return;
    }

    // Step 3: Assign each feedback to appropriate review
    console.log("🔗 Assigning feedback to reviews...");
    let assignedCount = 0;
    let skippedCount = 0;

    for (const fb of unassignedFeedback) {
      // Find next review for this reviewee after feedback was created
      const [nextReview] = await db
        .select()
        .from(reviewSchedules)
        .where(
          and(
            eq(reviewSchedules.userId, fb.revieweeId),
            gte(reviewSchedules.scheduledDate, fb.createdAt?.toISOString().split('T')[0] || '')
          )
        )
        .orderBy(reviewSchedules.scheduledDate)
        .limit(1);

      if (nextReview) {
        // Assign feedback to this review
        // review_schedule_id was dropped from the feedback table (migration
        // 0010); raw SQL keeps this legacy script compiling unchanged.
        await db.execute(
          sql`UPDATE ${feedback} SET "review_schedule_id" = ${nextReview.id} WHERE ${feedback.id} = ${fb.id}`
        );

        assignedCount++;
        console.log(`   ✓ Assigned feedback ${fb.id.substring(0, 8)}... to review "${nextReview.name}"`);
      } else {
        skippedCount++;
        console.log(`   ⚠️  No review found for feedback ${fb.id.substring(0, 8)}... (reviewee: ${fb.revieweeId.substring(0, 8)}...)`);
      }
    }

    // Summary
    console.log(`\n📊 Backfill Summary:`);
    console.log(`   - Total unassigned feedback: ${unassignedFeedback.length}`);
    console.log(`   - Successfully assigned: ${assignedCount}`);
    console.log(`   - Skipped (no review found): ${skippedCount}`);
    console.log(`\n✅ Backfill completed successfully!`);

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the backfill
backfillFeedbackReviews();
