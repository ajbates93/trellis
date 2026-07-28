import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  requireUser(event);
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
