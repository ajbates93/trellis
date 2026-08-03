import { db } from "#server/database/connection";
import { slackWorkspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";
import { requireUser } from "#server/utils/auth-guards";

/**
 * Get Slack workspace connection status
 * GET /api/integrations/slack/status
 */
export default defineEventHandler(async (event) => {
  try {
    const user = requireUser(event);

    // Get current workspace
    const workspaceId = getWorkspaceId(event);

    // Check if user is admin
    const isAdmin = user.role === "admin" || user.isSuperAdmin === true;

    // Check if Slack workspace is connected
    const [slackWorkspace] = await db
      .select({
        id: slackWorkspaces.id,
        slackTeamId: slackWorkspaces.slackTeamId,
        slackTeamName: slackWorkspaces.slackTeamName,
        installedAt: slackWorkspaces.installedAt,
        installedBy: slackWorkspaces.installedBy,
      })
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId))
      .limit(1);

    return {
      slackWorkspace: slackWorkspace || null,
      isAdmin,
    };
  } catch (error: any) {
    console.error("Slack status check error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to check Slack status",
    });
  }
});
