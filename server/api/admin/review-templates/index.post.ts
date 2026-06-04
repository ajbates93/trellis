import { db } from "#server/database/connection";
import { reviewTemplates, users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody } from "#server/utils/validation";
import { CreateReviewTemplateRequestSchema } from "#server/schemas/reviewTemplates";
import { buildSnapshot } from "#server/utils/reviewTemplates";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }
  if (session.user.role !== "admin") {
    throw createError({ statusCode: 403, message: "Admin access required" });
  }

  const body = await validateBody(event, CreateReviewTemplateRequestSchema);

  let fields;
  try {
    fields = buildSnapshot(body.fields);
  } catch {
    throw createError({ statusCode: 400, message: "Invalid template fields" });
  }

  const [actor] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [template] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId: actor?.workspaceId ?? null,
      name: body.name,
      description: body.description ?? null,
      isDefault: false,
      fields,
      createdBy: session.user.id,
    })
    .returning();

  return { success: true, template };
});
