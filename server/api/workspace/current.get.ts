import { db } from "#server/database/connection";
import { workspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  const workspaceId = user.workspaceId;

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
