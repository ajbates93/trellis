import "dotenv/config";
import { client } from "./connection";

async function applySchema() {
  console.log("🔧 Adding new columns to database...\n");

  try {
    // Add columns one by one
    console.log("   Adding role column...");
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`;

    console.log("   Adding banned column...");
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false`;

    console.log("   Adding ban_reason column...");
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255)`;

    console.log("   Adding ban_expires column...");
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMP`;

    console.log("   Dropping old is_admin column...");
    await client`ALTER TABLE users DROP COLUMN IF EXISTS is_admin`;

    console.log("   Adding impersonated_by column to session table...");
    await client`ALTER TABLE session ADD COLUMN IF NOT EXISTS impersonated_by TEXT`;

    console.log("\n✅ Schema changes applied successfully!\n");
  } catch (error) {
    console.error("❌ Schema changes failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

applySchema();
