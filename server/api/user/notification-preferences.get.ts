import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const [row] = await db
    .select({ emailNotificationPreferences: users.emailNotificationPreferences })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return { preferences: row?.emailNotificationPreferences ?? {} };
});
