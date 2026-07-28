import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody, validateResponse } from "#server/utils/validation";
import { requireUser } from "#server/utils/auth-guards";

const EmailCategoryKey = z.enum([
  "feedback_received",
  "buddy_feedback_received",
  "review_created",
  "review_rescheduled",
  "review_cancelled",
  "review_completed",
  "review_reminder",
]);

const BodySchema = z.object({
  preferences: z.record(EmailCategoryKey, z.boolean()),
});

const ResponseSchema = z.object({ success: z.literal(true) });

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const { preferences } = await validateBody(event, BodySchema);

  await db
    .update(users)
    .set({ emailNotificationPreferences: preferences })
    .where(eq(users.id, user.id));

  return validateResponse({ success: true }, ResponseSchema);
});
