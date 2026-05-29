import { assertDemoMode } from "#server/utils/demo";
import { seedDemo } from "#server/database/seed-demo";

export default defineEventHandler(async (event) => {
  assertDemoMode(); // 404 outside demo mode

  const expected = process.env.DEMO_RESET_SECRET;
  const provided = getHeader(event, "x-demo-secret");
  if (!expected || provided !== expected) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  await seedDemo();
  return { ok: true };
});
