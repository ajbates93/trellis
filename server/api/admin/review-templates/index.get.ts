import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  const workspaceId = getWorkspaceId(event);

  const templates = await db
    .select()
    .from(reviewTemplates)
    .where(
      and(
        eq(reviewTemplates.workspaceId, workspaceId),
        isNull(reviewTemplates.archivedAt),
      ),
    )
    .orderBy(desc(reviewTemplates.isDefault), desc(reviewTemplates.createdAt));

  return { success: true, templates };
});
