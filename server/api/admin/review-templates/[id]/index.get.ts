import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Template id is required" });
  const workspaceId = getWorkspaceId(event);

  const [template] = await db
    .select()
    .from(reviewTemplates)
    .where(and(eq(reviewTemplates.id, id), eq(reviewTemplates.workspaceId, workspaceId)))
    .limit(1);

  if (!template) throw createError({ statusCode: 404, message: "Template not found" });
  return { success: true, template };
});
