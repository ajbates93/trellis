import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { validateBody } from "#server/utils/validation";
import { getWorkspaceId } from "#server/utils/workspace";
import { CreateReviewTemplateRequestSchema } from "#server/schemas/reviewTemplates";
import { buildSnapshot } from "#server/utils/reviewTemplates";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const workspaceId = getWorkspaceId(event);

  const body = await validateBody(event, CreateReviewTemplateRequestSchema);

  let fields;
  try {
    fields = buildSnapshot(body.fields);
  } catch {
    throw createError({ statusCode: 400, message: "Invalid template fields" });
  }

  const [template] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      isDefault: false,
      fields,
      createdBy: user.id,
    })
    .returning();

  return { success: true, template };
});
