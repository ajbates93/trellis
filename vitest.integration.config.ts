import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Integration tier: runs the REAL query layer against a disposable Postgres
// (TEST_DATABASE_URL). Separate from the fast mocked unit suite (vitest.config.ts)
// so the mocked tests stay hermetic and fast, while these exercise the seams the
// mocks hide - query predicates, workspace scoping and validation (CQ-5).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["server/**/*.integration.test.ts"],
    setupFiles: ["./server/__tests__/integration/setup.ts"],
    globalSetup: ["./server/__tests__/integration/global-setup.ts"],
    // One shared database, so run test files serially to avoid cross-file
    // interference from the per-test TRUNCATE.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./", import.meta.url)),
      "#server": fileURLToPath(new URL("./server", import.meta.url)),
    },
  },
});
