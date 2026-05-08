import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody, validateResponse } from "#server/utils/validation";

const BodySchema = z.object({
  preferences: z.record(z.string(), z.boolean()),
});

const ResponseSchema = z.object({ success: z.literal(true) });

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  const { preferences } = await validateBody(event, BodySchema);

  await db
    .update(users)
    .set({ emailNotificationPreferences: preferences })
    .where(eq(users.id, session.user.id));

  return validateResponse({ success: true }, ResponseSchema);
});
