import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  const id = getRouterParam(event, "id");
  const [source] = await db
    .select()
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
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
      createdBy: session.user.id,
    })
    .returning();

  return { success: true, template: copy };
});
