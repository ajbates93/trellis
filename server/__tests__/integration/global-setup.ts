import { execSync } from "node:child_process";

/**
 * Runs once before the integration suite: materialise the current schema.ts
 * into the disposable test database named by TEST_DATABASE_URL.
 *
 * This uses `drizzle-kit push` (schema.ts) rather than the migration chain on
 * purpose: schema.ts is the single source of truth the application code and
 * types are written against, so the query layer under test must be exercised
 * against exactly that shape. The separate concern - that the committed
 * migration chain reproduces schema.ts - is guarded by the Migration Drift
 * Check CI job (CQ-2), so the two together keep chain, schema and tests aligned
 * without this tier depending on migration correctness.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL must be set to run the integration test tier (a real, disposable Postgres). " +
        "Locally: createdb trellis_test && TEST_DATABASE_URL=postgresql://localhost:5432/trellis_test npm run test:integration",
    );
  }

  // `yes` auto-confirms drizzle-kit's prompts; drizzle.config.ts reads
  // DATABASE_URL, so point it at the test database for this command only.
  execSync("yes | npx drizzle-kit push", {
    stdio: "inherit",
    shell: "/bin/bash",
    env: { ...process.env, DATABASE_URL: url },
  });
}
