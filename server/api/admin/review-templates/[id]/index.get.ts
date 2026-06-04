import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const [template] = await db
    .select()
    .from(reviewTemplates)
    .where(eq(reviewTemplates.id, id!))
    .limit(1);

  if (!template) throw createError({ statusCode: 404, message: "Template not found" });
  return { success: true, template };
});
