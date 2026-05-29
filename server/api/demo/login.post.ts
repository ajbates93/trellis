import { assertDemoMode } from "#server/utils/demo";

export default defineEventHandler(async (event) => {
  assertDemoMode(); // 404 outside demo mode

  // Dynamic import AFTER the guard: importing auth (and thus the DB connection)
  // at module load throws without DATABASE_URL, which would break the 404 guard
  // test. Loading it here keeps the guard path free of better-auth/DB side effects.
  const { auth } = await import("#server/utils/auth");

  const email = process.env.DEMO_ADMIN_EMAIL || "admin@northwind.demo";
  const password = process.env.DEMO_ADMIN_PASSWORD || "demo-trellis-1234";

  // Sign in server-side and forward the Set-Cookie header(s) to the client,
  // so prospects enter the demo with one click (no Google OAuth).
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      appendResponseHeader(event, "set-cookie", value);
    }
  }

  return { ok: true, redirect: "/dashboard" };
});
