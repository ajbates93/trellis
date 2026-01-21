import { db } from "../../../database/connection";
import { slackWorkspaces } from "../../../database/schema";
import { eq } from "drizzle-orm";

/**
 * Handles Slack OAuth callback
 * GET /api/integrations/slack/callback
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  try {
    // Get OAuth parameters
    const code = query.code as string;
    const state = query.state as string;
    const error = query.error as string;

    // Check for OAuth errors
    if (error) {
      console.error("Slack OAuth error:", error);
      return sendRedirect(
        event,
        "/settings/integrations?error=slack_oauth_failed"
      );
    }

    if (!code || !state) {
      throw createError({
        statusCode: 400,
        message: "Missing OAuth code or state",
      });
    }

    // Verify and decode state
    let stateData: { workspaceId: string; nonce: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch (error) {
      throw createError({
        statusCode: 400,
        message: "Invalid state parameter",
      });
    }

    // Verify state timestamp (prevent replay attacks - 10 minute window)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 600000) {
      throw createError({
        statusCode: 400,
        message: "State token expired",
      });
    }

    const { workspaceId } = stateData;

    // Exchange code for access token
    const redirectUri = `${config.public.baseUrl || config.betterAuthUrl}/api/integrations/slack/callback`;

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.slackClientId,
        client_secret: config.slackClientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error("Slack OAuth token exchange failed:", tokenData.error);
      throw createError({
        statusCode: 400,
        message: `Slack OAuth failed: ${tokenData.error}`,
      });
    }

    // Extract tokens and team info
    const accessToken = tokenData.access_token;
    const slackTeamId = tokenData.team.id;
    const slackTeamName = tokenData.team.name;
    const botUserId = tokenData.bot_user_id;

    // Get current user for installed_by field
    const user = event.context.user;
    if (!user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Check if Slack workspace already exists
    const [existingSlackWorkspace] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, slackTeamId))
      .limit(1);

    if (existingSlackWorkspace) {
      // Update existing record
      await db
        .update(slackWorkspaces)
        .set({
          workspaceId,
          slackTeamName,
          accessToken, // TODO: Encrypt in production
          botUserId,
          installedBy: user.id,
          installedAt: new Date(),
        })
        .where(eq(slackWorkspaces.slackTeamId, slackTeamId));
    } else {
      // Create new record
      await db.insert(slackWorkspaces).values({
        workspaceId,
        slackTeamId,
        slackTeamName,
        accessToken, // TODO: Encrypt in production
        botUserId,
        installedBy: user.id,
        installedAt: new Date(),
      });
    }

    // Redirect back to integrations page with success message
    return sendRedirect(
      event,
      "/settings/integrations?success=slack_installed"
    );
  } catch (error: any) {
    console.error("Slack OAuth callback error:", error);
    return sendRedirect(
      event,
      `/settings/integrations?error=${encodeURIComponent(error.message || "slack_install_failed")}`
    );
  }
});
