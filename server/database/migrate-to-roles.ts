import "dotenv/config";
import { db, client } from "./connection";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🔧 Migrating database to use Better Auth admin plugin fields...\n");

  try {
    // Add new columns to users table
    console.log("   Adding role column to users table...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
    `);

    console.log("   Adding banned column to users table...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false
    `);

    console.log("   Adding ban_reason column to users table...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255)
    `);

    console.log("   Adding ban_expires column to users table...");
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP
    `);

    // Migrate existing is_admin values to role
    console.log("   Migrating existing is_admin values to role field...");
    await db.execute(sql`
      UPDATE users
      SET role = CASE
        WHEN is_admin = true THEN 'admin'
        ELSE 'user'
      END
      WHERE role IS NULL OR role = 'user'
    `);

    // Drop old is_admin column
    console.log("   Dropping old is_admin column...");
    await db.execute(sql`
      ALTER TABLE users
      DROP COLUMN IF EXISTS is_admin
    `);

    // Add impersonatedBy column to session table
    console.log("   Adding impersonated_by column to session table...");
    await db.execute(sql`
      ALTER TABLE session
      ADD COLUMN IF NOT EXISTS impersonated_by TEXT
    `);

    console.log("\n✅ Migration completed successfully!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration
migrate();
