import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const [existing] = await db
    .select({ isDefault: reviewTemplates.isDefault })
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
    .limit(1);

  if (!existing) throw createError({ statusCode: 404, message: "Template not found" });
  if (existing.isDefault) {
    throw createError({ statusCode: 400, message: "The default template cannot be archived" });
  }

  await db
    .update(reviewTemplates)
    .set({ archivedAt: new Date() })
    .where(eq(reviewTemplates.id, id!));

  return { success: true };
});
