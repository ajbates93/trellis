import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, user.id),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  return validateResponse(
    { success: true, updated: updated.length },
    apiSchemas.MarkAllNotificationsReadResponseSchema,
  );
});
