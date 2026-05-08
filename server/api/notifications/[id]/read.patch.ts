import { db } from '#server/database/connection'
import { notifications } from '#server/database/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { validateResponse } from '#server/utils/validation'
import { apiSchemas } from '#server/schemas'

export default defineEventHandler(async (event) => {
  const session = event.context.session

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Please log in',
    })
  }

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
        eq(notifications.userId, session.user.id),
        isNull(notifications.readAt),
      ),
    )

  return validateResponse(
    { success: true },
    apiSchemas.MarkNotificationReadResponseSchema,
  )
})
