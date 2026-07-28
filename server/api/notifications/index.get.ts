import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";
import { and, eq, isNull, lt, desc } from "drizzle-orm";
import { validateQuery, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const { limit, cursor, filter } = validateQuery(
    event,
    apiSchemas.ListNotificationsQuerySchema,
  );

  const conditions = [eq(notifications.userId, user.id)];
  if (filter === "unread") conditions.push(isNull(notifications.readAt));
  if (cursor) conditions.push(lt(notifications.createdAt, new Date(cursor)));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const nextCursor =
    rows.length === limit ? rows[rows.length - 1]!.createdAt.toISOString() : null;

  const items = rows.map((r) => ({
    ...r,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return validateResponse(
    { items, nextCursor },
    apiSchemas.ListNotificationsResponseSchema,
  );
});
