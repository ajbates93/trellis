import "dotenv/config";
import { db, client } from "./connection";
import { users, feedback, feedbackPrompts, goals, goalNotes, feedbackInsights, onboardingImports, reviewSchedules } from "./schema";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("🗑️  Resetting database...\n");

  try {
    // Delete in order to respect foreign key constraints
    console.log("   Deleting goal notes...");
    await db.delete(goalNotes);

    console.log("   Deleting goals...");
    await db.delete(goals);

    console.log("   Deleting feedback insights...");
    await db.delete(feedbackInsights);

    console.log("   Deleting feedback...");
    await db.delete(feedback);

    console.log("   Deleting review schedules...");
    await db.delete(reviewSchedules);

    console.log("   Deleting onboarding imports...");
    await db.delete(onboardingImports);

    console.log("   Deleting users...");
    await db.delete(users);

    console.log("   Deleting feedback prompts...");
    await db.delete(feedbackPrompts);

    // Reset sequences if needed
    await db.execute(sql`ALTER SEQUENCE IF EXISTS feedback_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE IF EXISTS feedback_prompts_id_seq RESTART WITH 1`);

    console.log("\n✅ Database reset complete!\n");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run reset
reset();
