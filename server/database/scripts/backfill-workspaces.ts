import "dotenv/config";
import { db } from "../connection";
import { workspaces, users } from "../schema";
import { eq } from "drizzle-orm";

/**
 * Backfill script to create Pocketworks workspace and assign all users
 *
 * Steps:
 * 1. Create the "Pocketworks" workspace
 * 2. Update all existing users with workspaceId = pocketworks.id
 * 3. Set isSuperAdmin = true for alex.bates@pocketworks.co.uk
 */
async function backfillWorkspaces() {
  console.log("🔄 Starting workspace backfill...\n");

  try {
    // Step 1: Check if Pocketworks workspace already exists
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.name, "Pocketworks"))
      .limit(1);

    let pocketworksWorkspace;

    if (existingWorkspace.length > 0) {
      console.log("✓ Pocketworks workspace already exists");
      pocketworksWorkspace = existingWorkspace[0];
    } else {
      // Create Pocketworks workspace
      console.log("📝 Creating Pocketworks workspace...");
      const workspaceId = crypto.randomUUID();
      const [newWorkspace] = await db
        .insert(workspaces)
        .values({
          id: workspaceId,
          name: "Pocketworks",
          logoUrl: null,
        })
        .returning();

      pocketworksWorkspace = newWorkspace;
      console.log(`   ✓ Created workspace: ${pocketworksWorkspace.name} (${pocketworksWorkspace.id})`);
    }

    // Step 2: Update all users without a workspaceId
    console.log("\n📋 Assigning users to Pocketworks workspace...");
    const allUsers = await db.select().from(users);
    let assignedCount = 0;

    for (const user of allUsers) {
      if (!user.workspaceId) {
        await db
          .update(users)
          .set({ workspaceId: pocketworksWorkspace.id })
          .where(eq(users.id, user.id));
        assignedCount++;
        console.log(`   ✓ Assigned ${user.email} to Pocketworks`);
      }
    }

    console.log(`   Total users assigned: ${assignedCount}`);

    // Step 3: Set super admin
    console.log("\n👑 Setting super admin...");
    const superAdminEmail = "alex.bates@pocketworks.co.uk";
    const superAdminResult = await db
      .update(users)
      .set({ isSuperAdmin: true })
      .where(eq(users.email, superAdminEmail))
      .returning();

    if (superAdminResult.length > 0) {
      console.log(`   ✓ Set ${superAdminEmail} as super admin`);
    } else {
      console.log(`   ⚠️  User ${superAdminEmail} not found - super admin not set`);
    }

    // Summary
    console.log(`\n📊 Backfill Summary:`);
    console.log(`   - Workspace: ${pocketworksWorkspace.name}`);
    console.log(`   - Users assigned: ${assignedCount}`);
    console.log(`   - Super admin: ${superAdminResult.length > 0 ? superAdminEmail : 'Not set'}`);
    console.log(`\n✅ Backfill completed successfully!`);

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the backfill
backfillWorkspaces();
