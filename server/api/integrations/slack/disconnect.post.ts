import { db } from "#server/database/connection";
import { slackWorkspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { getWorkspaceId } from "#server/utils/workspace";

/**
 * Disconnect Slack workspace integration
 * POST /api/integrations/slack/disconnect
 */
export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Check if user is admin
    if (user.role !== "admin" && !user.isSuperAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only admins can disconnect Slack integration",
      });
    }

    // Get current workspace
    const workspaceId = getWorkspaceId(event);

    // Delete Slack workspace connection
    const result = await db
      .delete(slackWorkspaces)
      .where(eq(slackWorkspaces.workspaceId, workspaceId))
      .returning();

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        message: "No Slack integration found",
      });
    }

    return {
      success: true,
      message: "Slack integration disconnected successfully",
    };
  } catch (error: any) {
    console.error("Slack disconnect error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to disconnect Slack",
    });
  }
});
