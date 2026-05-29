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
  let response: Awaited<ReturnType<typeof auth.api.signInEmail<true>>>;
  try {
    response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Demo not ready - run the demo seed/reset first.",
    });
  }

  for (const cookie of response.headers.getSetCookie()) {
    appendResponseHeader(event, "set-cookie", cookie);
  }

  return { ok: true, redirect: "/dashboard" };
});
