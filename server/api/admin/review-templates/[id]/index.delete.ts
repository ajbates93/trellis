import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Template id is required" });
  const workspaceId = getWorkspaceId(event);

  const [existing] = await db
    .select({ isDefault: reviewTemplates.isDefault })
    .from(reviewTemplates)
    .where(and(eq(reviewTemplates.id, id), eq(reviewTemplates.workspaceId, workspaceId)))
    .limit(1);

  if (!existing) throw createError({ statusCode: 404, message: "Template not found" });
  if (existing.isDefault) {
    throw createError({ statusCode: 400, message: "The default template cannot be archived" });
  }

  await db
    .update(reviewTemplates)
    .set({ archivedAt: new Date() })
    .where(and(eq(reviewTemplates.id, id), eq(reviewTemplates.workspaceId, workspaceId)));

  return { success: true };
});
