import { db } from "#server/database/connection";
import { demoRequests } from "#server/database/schema";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { sendEmail, emailTemplates } from "#server/utils/email";

const INTERNAL_NOTIFICATION_TO =
  process.env.DEMO_REQUEST_NOTIFY_EMAIL || "alex.bates@pocketworks.co.uk";

export default defineEventHandler(async (event) => {
  // The zod schema rejects any non-empty `website` field (honeypot) via .max(0),
  // so bots get a 400 from validateBody before reaching the insert.
  const body = await validateBody(event, apiSchemas.DemoRequestSchema);

  await db
    .insert(demoRequests)
    .values({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      company: body.company.trim(),
      teamSize: body.teamSize,
      message: body.message?.trim() || null,
    })
    .returning();

  // Fire internal notification (must succeed; we want to know about every lead)
  await sendEmail({
    to: INTERNAL_NOTIFICATION_TO,
    subject: `[Trellis] New demo request from ${body.company}`,
    html: emailTemplates.demoRequestInternal({
      name: body.name,
      email: body.email,
      company: body.company,
      teamSize: body.teamSize,
      message: body.message ?? null,
    }),
  });

  // Confirmation email - non-fatal if it fails
  try {
    await sendEmail({
      to: body.email,
      subject: "Thanks for requesting a Trellis demo",
      html: emailTemplates.demoRequestConfirmation(body.name),
    });
  } catch (err) {
    console.error("Failed to send demo request confirmation email:", err);
  }

  return validateResponse({ ok: true }, apiSchemas.DemoRequestResponseSchema);
});
