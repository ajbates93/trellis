import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  const [row] = await db
    .select({ emailNotificationPreferences: users.emailNotificationPreferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { preferences: row?.emailNotificationPreferences ?? {} };
});
