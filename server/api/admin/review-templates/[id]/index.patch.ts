import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody } from "#server/utils/validation";
import { UpdateReviewTemplateRequestSchema } from "#server/schemas/reviewTemplates";
import { buildSnapshot } from "#server/utils/reviewTemplates";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await validateBody(event, UpdateReviewTemplateRequestSchema);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.fields !== undefined) {
    try {
      updateData.fields = buildSnapshot(body.fields);
    } catch {
      throw createError({ statusCode: 400, message: "Invalid template fields" });
    }
  }

  const [template] = await db
    .update(reviewTemplates)
    .set(updateData)
    .where(eq(reviewTemplates.id, id!))
    .returning();

  if (!template) throw createError({ statusCode: 404, message: "Template not found" });
  return { success: true, template };
});
