import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

/**
 * List the workspace's review templates for selection when scheduling a review.
 *
 * Available to any authenticated workspace member, so the buddy setting up a
 * review can choose a template - unlike the admin-only CRUD endpoints under
 * /api/admin/review-templates (create/edit/delete stay admin-gated). Read-only.
 */
export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized - Please log in" });
  }

  // Non-throwing workspace read: a missing workspace context should just hide
  // the picker (empty list), not 403 the whole scheduling flow.
  const workspaceId = event.context.user?.workspaceId ?? null;
  if (!workspaceId) {
    return { success: true, templates: [] };
  }

  const templates = await db
    .select({
      id: reviewTemplates.id,
      name: reviewTemplates.name,
      isDefault: reviewTemplates.isDefault,
    })
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
