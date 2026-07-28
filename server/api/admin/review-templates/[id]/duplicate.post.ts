import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Template id is required" });
  const workspaceId = getWorkspaceId(event);
  const [source] = await db
    .select()
    .from(reviewTemplates)
    .where(and(eq(reviewTemplates.id, id), eq(reviewTemplates.workspaceId, workspaceId)))
    .limit(1);

  if (!source) throw createError({ statusCode: 404, message: "Template not found" });

  const [copy] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId: source.workspaceId,
      name: `${source.name} (copy)`,
      description: source.description,
      isDefault: false,
      fields: source.fields,
      createdBy: user.id,
    })
    .returning();

  return { success: true, template: copy };
});
