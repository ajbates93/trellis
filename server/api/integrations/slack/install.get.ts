import { randomBytes, createHmac } from "crypto";
import { setCookie } from "h3";
import { getWorkspaceId } from "#server/utils/workspace";
import { SLACK_INSTALL_NONCE_COOKIE } from "#server/utils/slack";

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

    // Generate state token with workspace ID and cryptographic nonce for CSRF protection
    const nonce = randomBytes(32).toString("hex");
    const payload = Buffer.from(
      JSON.stringify({
        workspaceId,
        nonce,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // HMAC-sign the payload to prevent forgery
    const hmac = createHmac("sha256", config.slackClientSecret).update(payload).digest("hex");
    const state = `${payload}.${hmac}`;

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

    // Bind the install to this browser session (F6): the callback requires
    // this cookie to match the state's nonce and clears it (single-use), so a
    // captured state cannot be completed by a victim admin's session.
    setCookie(event, SLACK_INSTALL_NONCE_COOKIE, nonce, {
      httpOnly: true,
      secure: redirectUri.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/slack",
      maxAge: 600,
    });

    // Redirect to Slack OAuth
    return sendRedirect(event, slackOAuthUrl.toString());
  } catch (error: any) {
    console.error("Slack install error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to initiate Slack installation",
    });
  }
});
