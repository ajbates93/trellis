import { createHmac, timingSafeEqual } from "crypto";
import { getCookie, deleteCookie } from "h3";
import { db } from "#server/database/connection";
import { slackWorkspaces } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "#server/utils/encryption";
import { requireUser } from "#server/utils/auth-guards";
import { SLACK_INSTALL_NONCE_COOKIE } from "#server/utils/slack";

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

    // Verify and decode state (format: payload.hmac)
    let stateData: { workspaceId: string; nonce: string; timestamp: number };
    try {
      const [payload, signature] = state.split(".");
      if (!payload || !signature) {
        throw new Error("Missing signature");
      }

      // Verify HMAC signature
      const expectedHmac = createHmac("sha256", config.slackClientSecret).update(payload).digest("hex");
      const signatureBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedHmac, "hex");
      if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
        throw new Error("Invalid signature");
      }

      stateData = JSON.parse(Buffer.from(payload, "base64").toString());
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

    // All session/binding checks happen BEFORE the code exchange (F6): a
    // request that fails them must not consume the OAuth code or mint a token.

    // The callback is a public route, so check the session by hand.
    const user = requireUser(event);
    if (user.role !== "admin" && !user.isSuperAdmin) {
      throw createError({
        statusCode: 403,
        message: "Forbidden - Only admins can install Slack integration",
      });
    }

    // Bind the install to the initiating session's workspace: the caller must
    // belong to the workspace named in the state, otherwise a captured state
    // completed by an admin of another workspace would bind the Slack team
    // (and its bot token) to the attacker's workspace.
    if (!user.workspaceId || user.workspaceId !== workspaceId) {
      throw createError({
        statusCode: 403,
        message: "Slack install state does not belong to your workspace",
      });
    }

    // Single-use nonce: the browser completing the callback must be the one
    // that initiated the install (cookie set in install.get.ts), and the
    // cookie is cleared here so a state value can never be replayed within
    // its validity window.
    const cookieNonce = getCookie(event, SLACK_INSTALL_NONCE_COOKIE);
    const nonceBuffer = Buffer.from(stateData.nonce ?? "");
    const cookieBuffer = Buffer.from(cookieNonce ?? "");
    if (
      !cookieNonce ||
      nonceBuffer.length === 0 ||
      nonceBuffer.length !== cookieBuffer.length ||
      !timingSafeEqual(nonceBuffer, cookieBuffer)
    ) {
      throw createError({
        statusCode: 403,
        message: "Slack install was not initiated from this session",
      });
    }
    deleteCookie(event, SLACK_INSTALL_NONCE_COOKIE, {
      path: "/api/integrations/slack",
    });

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
    const encryptedAccessToken = encrypt(accessToken);
    const slackTeamId = tokenData.team.id;
    const slackTeamName = tokenData.team.name;
    const botUserId = tokenData.bot_user_id;

    // Check if this Slack team is already linked somewhere
    const [existingSlackWorkspace] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, slackTeamId))
      .limit(1);

    // Never silently re-bind a Slack team that another workspace owns (F6):
    // the upsert keyed on slackTeamId would otherwise hijack the existing
    // integration (and its /submit routing) onto the caller's workspace.
    // Re-installing into the SAME workspace (token refresh, scope change)
    // remains allowed.
    if (existingSlackWorkspace && existingSlackWorkspace.workspaceId !== workspaceId) {
      console.warn(
        `Slack install refused: team ${slackTeamId} is already linked to another workspace`,
      );
      return sendRedirect(
        event,
        "/settings/integrations?error=slack_team_already_linked",
      );
    }

    if (existingSlackWorkspace) {
      // Update existing record (same workspace re-install)
      await db
        .update(slackWorkspaces)
        .set({
          workspaceId,
          slackTeamName,
          accessToken: encryptedAccessToken,
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
        accessToken: encryptedAccessToken,
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
      "/settings/integrations?error=slack_install_failed"
    );
  }
});
