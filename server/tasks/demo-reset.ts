import { isDemoMode } from "#server/utils/demo";
import { seedDemo } from "#server/database/seed-demo";

export default defineTask({
  meta: {
    name: "demo-reset",
    description: "Nightly wipe + reseed of the demo environment",
  },
  async run() {
    if (!isDemoMode()) {
      return { result: "skipped: not demo mode" };
    }
    try {
      await seedDemo();
      return { result: "demo reset complete" };
    } catch (error) {
      console.error("[demo-reset] failed:", error);
      return { result: `failed: ${error}` };
    }
  },
});
