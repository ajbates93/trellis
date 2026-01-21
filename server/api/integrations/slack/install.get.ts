import { getWorkspaceId } from "../../../utils/workspace";

/**
 * Initiates Slack OAuth install flow
 * GET /api/integrations/slack/install
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  try {
    // Get current workspace
    const workspaceId = getWorkspaceId(event);

    // Check if user is admin
    const user = event.context.user;
    if (user?.role !== "admin" && !user?.isSuperAdmin) {
      throw createError({
        statusCode: 403,
        message: "Only admins can install Slack integration",
      });
    }

    // Generate state token with workspace ID and random nonce for CSRF protection
    const nonce = Math.random().toString(36).substring(7);
    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        nonce,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Build Slack OAuth URL
    const scopes = [
      "commands",
      "users:read",
      "users:read.email",
      "chat:write",
    ].join(",");

    const redirectUri = `${config.public.baseUrl || config.betterAuthUrl}/api/integrations/slack/callback`;

    const slackOAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackOAuthUrl.searchParams.set("client_id", config.slackClientId);
    slackOAuthUrl.searchParams.set("scope", scopes);
    slackOAuthUrl.searchParams.set("state", state);
    slackOAuthUrl.searchParams.set("redirect_uri", redirectUri);

    // Store state in session for verification (optional additional security)
    // This requires session storage implementation

    // Redirect to Slack OAuth
    return sendRedirect(event, slackOAuthUrl.toString());
  } catch (error: any) {
    console.error("Slack install error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to initiate Slack installation",
    });
  }
});
