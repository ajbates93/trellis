import { db } from "#server/database/connection";
import { workspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const workspaceId = session.user.workspaceId;

  if (!workspaceId) {
    return { workspace: null };
  }

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      logoUrl: workspaces.logoUrl,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return { workspace: workspace || null };
});
