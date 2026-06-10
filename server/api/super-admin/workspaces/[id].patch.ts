import { db } from "#server/database/connection";
import { workspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  // Super admin middleware already verified access

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Workspace ID is required",
    });
  }

  const body = await readBody(event);
  const parsed = UpdateWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map(e => e.message).join(", "),
    });
  }

  // Check workspace exists
  const [existing] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: "Workspace not found",
    });
  }

  // Update workspace
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
  }

  if (parsed.data.logoUrl !== undefined) {
    updateData.logoUrl = parsed.data.logoUrl;
  }

  const [updated] = await db
    .update(workspaces)
    .set(updateData)
    .where(eq(workspaces.id, id))
    .returning();

  return {
    success: true,
    workspace: updated,
  };
});
