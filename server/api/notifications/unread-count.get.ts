import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        isNull(notifications.readAt),
      ),
    );

  return validateResponse(
    { count: row?.count ?? 0 },
    apiSchemas.NotificationUnreadCountResponseSchema,
  );
});
