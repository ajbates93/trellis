import { db } from "#server/database/connection";
import { reviewTemplates, users } from "#server/database/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  if (session.user.role !== "admin") {
    throw createError({ statusCode: 403, message: "Admin access required" });
  }

  const [actor] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const templates = await db
    .select()
    .from(reviewTemplates)
    .where(
      and(
        actor?.workspaceId
          ? eq(reviewTemplates.workspaceId, actor.workspaceId)
          : isNull(reviewTemplates.workspaceId),
        isNull(reviewTemplates.archivedAt),
      ),
    )
    .orderBy(desc(reviewTemplates.isDefault), desc(reviewTemplates.createdAt));

  return { success: true, templates };
});
