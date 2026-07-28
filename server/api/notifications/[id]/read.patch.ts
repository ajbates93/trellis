import { db } from '#server/database/connection'
import { notifications } from '#server/database/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { validateResponse } from '#server/utils/validation'
import { apiSchemas } from '#server/schemas'
import { requireUser } from '#server/utils/auth-guards'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Notification id is required',
    })
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, user.id),
        isNull(notifications.readAt),
      ),
    )

  return validateResponse(
    { success: true },
    apiSchemas.MarkNotificationReadResponseSchema,
  )
})
