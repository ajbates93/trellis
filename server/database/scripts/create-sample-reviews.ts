import "dotenv/config";
import { db } from "#server/database/connection";
import { users, reviewSchedules } from "#server/database/schema";

// Import sql from drizzle-orm
import { sql } from "drizzle-orm";

/**
 * Create sample review schedules for all users
 */
async function createSampleReviews() {
  console.log("📅 Creating sample review schedules...\n");

  try {
    // Get all users with buddies
    const allUsers = await db
      .select()
      .from(users)
      .where(sql`${users.buddyId} IS NOT NULL`);

    console.log(`Found ${allUsers.length} users with buddies\n`);

    const now = new Date();
    let createdCount = 0;

    for (const user of allUsers) {
      // Create 3 reviews for each user:
      // 1. Past review (3 months ago)
      // 2. Recent review (1 month ago)
      // 3. Upcoming review (2 months from now)

      const reviews = [
        {
          scheduledDate: new Date(now.getFullYear(), now.getMonth() - 3, 15),
          status: 'completed' as const,
        },
        {
          scheduledDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
          status: 'completed' as const,
        },
        {
          scheduledDate: new Date(now.getFullYear(), now.getMonth() + 2, 15),
          status: 'scheduled' as const,
        },
      ];

      for (const review of reviews) {
        await db.insert(reviewSchedules).values({
          userId: user.id,
          buddyId: user.buddyId!,
          scheduledDate: review.scheduledDate.toISOString().split('T')[0],
          status: review.status,
          // Name will be set by backfill script
        });

        createdCount++;
        const reviewType = review.status === 'completed' ? '✓ Past' : '📅 Upcoming';
        console.log(`   ${reviewType} review for ${user.name}: ${review.scheduledDate.toLocaleDateString()}`);
      }
    }

    console.log(`\n✅ Created ${createdCount} review schedules!`);

  } catch (error) {
    console.error("❌ Failed to create reviews:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createSampleReviews();
