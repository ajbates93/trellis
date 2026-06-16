import "dotenv/config";
import { db } from "#server/database/connection";
import {
  reviewSchedules,
  users,
  workspaces,
} from "#server/database/schema";
import { eq, isNull } from "drizzle-orm";
import {
  DEFAULT_TEMPLATE_FIELDS,
  DEFAULT_FIELD_IDS,
} from "#server/utils/reviewTemplates";
import { ensureDefaultReviewTemplate } from "#server/utils/ensureDefaultReviewTemplate";

/**
 * One-time data script to seed default review templates and backfill reviews.
 *
 * Steps:
 * 1. Ensure a "Default" review template exists per workspace
 * 2. Ensure a null-workspace fallback "Default" template exists
 * 3. Backfill every review missing a templateSnapshot with the default
 *    snapshot + answers derived from the legacy reflection columns
 */
async function seedReviewTemplates() {
  console.log("🔄 Starting review template seed + backfill...\n");

  try {
    // Step 1: Ensure a default template per workspace
    console.log("📝 Ensuring default templates per workspace...");
    const allWorkspaces = await db
      .select({ id: workspaces.id })
      .from(workspaces);

    const [anyAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    for (const ws of allWorkspaces) {
      await ensureDefaultReviewTemplate(ws.id, anyAdmin?.id ?? null);
      console.log(`   ✓ Default template ready for workspace ${ws.id}`);
    }

    // Step 2: Ensure a null-workspace fallback template
    await ensureDefaultReviewTemplate(null, anyAdmin?.id ?? null);
    console.log("   ✓ Default template ready for null-workspace fallback");

    // Step 3: Backfill reviews missing a snapshot
    console.log("\n📋 Backfilling reviews without a template snapshot...");
    const reviews = await db
      .select()
      .from(reviewSchedules)
      .where(isNull(reviewSchedules.templateSnapshot));

    let migrated = 0;
    for (const r of reviews) {
      const answers: Record<string, string> = {};
      if (r.reflectionLearnings)
        answers[DEFAULT_FIELD_IDS.learnings] = r.reflectionLearnings;
      if (r.reflectionHighlights)
        answers[DEFAULT_FIELD_IDS.highlights] = r.reflectionHighlights;
      if (r.reflectionConcerns)
        answers[DEFAULT_FIELD_IDS.concerns] = r.reflectionConcerns;

      await db
        .update(reviewSchedules)
        .set({ templateSnapshot: DEFAULT_TEMPLATE_FIELDS, answers })
        .where(eq(reviewSchedules.id, r.id));
      migrated++;
    }

    console.log(
      `\n📊 Summary: seeded default templates and backfilled ${migrated} reviews.`,
    );
    console.log("\n✅ Seed + backfill completed successfully!");
  } catch (error) {
    console.error("❌ Seed + backfill failed:", error);
    throw error;
  }
}

// Run the seed + backfill
seedReviewTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
