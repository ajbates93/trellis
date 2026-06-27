import { db } from "#server/database/connection";
import { reviewTemplates } from "#server/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_TEMPLATE_FIELDS } from "#server/utils/reviewTemplates";

/**
 * Idempotently ensure a workspace has a default review template.
 *
 * Returns the existing default if one is present, otherwise creates one from
 * DEFAULT_TEMPLATE_FIELDS (the standard three-question reflection). Pass
 * workspaceId `null` for the legacy null-workspace fallback template.
 *
 * Lives in its own module (not reviewTemplates.ts) so the pure schema helpers
 * there stay free of a database-connection import.
 */
export async function ensureDefaultReviewTemplate(
  workspaceId: string | null,
  createdBy: string | null,
) {
  const whereWorkspace = workspaceId
    ? eq(reviewTemplates.workspaceId, workspaceId)
    : isNull(reviewTemplates.workspaceId);

  const [existing] = await db
    .select()
    .from(reviewTemplates)
    .where(and(whereWorkspace, eq(reviewTemplates.isDefault, true)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(reviewTemplates)
    .values({
      workspaceId,
      name: "Default",
      description: "The standard three-question reflection.",
      isDefault: true,
      fields: DEFAULT_TEMPLATE_FIELDS,
      createdBy,
    })
    .returning();

  return created;
}
