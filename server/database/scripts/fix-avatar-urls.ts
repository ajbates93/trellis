import "dotenv/config";
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, isNotNull } from "drizzle-orm";
import { convertAvatarUrl } from "#server/utils/avatar-url";

/**
 * One-off script to convert existing signed S3 avatar URLs to proxy URL format.
 *
 * Signed URLs look like:
 *   https://b1.eu-central-1.storage.railway.app/stocked-cart-.../avatars/userId/uuid.png?X-Amz-...
 *
 * We extract the key (avatars/...) and store as:
 *   /api/avatars/avatars/userId/uuid.png
 *
 * Run: npx tsx server/database/scripts/fix-avatar-urls.ts
 */
async function fixAvatarUrls() {
  console.log("Starting avatar URL migration...\n");

  const usersWithAvatars = await db
    .select({ id: users.id, avatarUrl: users.avatarUrl })
    .from(users)
    .where(isNotNull(users.avatarUrl));

  let updated = 0;
  let skipped = 0;

  for (const user of usersWithAvatars) {
    if (!user.avatarUrl) continue;

    const proxyUrl = convertAvatarUrl(user.avatarUrl);

    // Already migrated
    if (proxyUrl === user.avatarUrl) {
      console.log(`  Skipping ${user.id} - already migrated`);
      skipped++;
      continue;
    }

    if (!proxyUrl) {
      console.log(`  WARNING: Could not extract key from URL for user ${user.id}: ${user.avatarUrl.substring(0, 80)}...`);
      skipped++;
      continue;
    }

    await db
      .update(users)
      .set({ avatarUrl: proxyUrl })
      .where(eq(users.id, user.id));

    console.log(`  Updated ${user.id}: ${proxyUrl}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

fixAvatarUrls().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
