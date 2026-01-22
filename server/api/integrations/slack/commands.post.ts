import { db } from "../../../database/connection";
import { slackWorkspaces, users } from "../../../database/schema";
import { eq, and, ilike } from "drizzle-orm";
import {
  verifySlackSignature,
  getSlackUserInfo,
  openSlackModal,
  buildFeedbackModal,
  extractUserIdFromMention,
  extractMentionedName,
  extractFeedbackText,
} from "../../../utils/slack";

/**
 * Handle Slack slash commands
 * POST /api/integrations/slack/commands
 */
export default defineEventHandler(async (event) => {
  try {
    console.log("[Slack Command] ========== NEW REQUEST ==========");
    console.log("[Slack Command] Method:", event.method);
    console.log("[Slack Command] Path:", event.path);
    console.log("[Slack Command] Headers:", getHeaders(event));

    // Read raw body for signature verification
    const body = await readRawBody(event);
    if (!body) {
      console.error("[Slack Command] Missing request body");
      return {
        response_type: "ephemeral",
        text: "⚠️ Error: No request body received",
      };
    }

    console.log("[Slack Command] Body received (length: " + body.length + ")");
    console.log("[Slack Command] Body preview:", body.substring(0, 200));

    // Verify Slack signature
    console.log("[Slack Command] Verifying signature...");
    if (!verifySlackSignature(event, body)) {
      console.error("[Slack Command] Signature verification failed");
      return {
        response_type: "ephemeral",
        text: "⚠️ Error: Invalid signature",
      };
    }

    console.log("[Slack Command] Signature verified successfully");

    // Parse form data
    const formData = new URLSearchParams(body);
    const command = formData.get("command");
    const text = formData.get("text") || "";
    const userId = formData.get("user_id");
    const teamId = formData.get("team_id");
    const triggerId = formData.get("trigger_id");

    if (!userId || !teamId || !triggerId) {
      throw createError({
        statusCode: 400,
        message: "Missing required Slack parameters",
      });
    }

    // Only handle /submit command
    if (command !== "/submit") {
      return {
        response_type: "ephemeral",
        text: `Unknown command: ${command}`,
      };
    }

    // Look up Slack workspace to get access token and Trellis workspace ID
    const [slackWorkspace] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, teamId))
      .limit(1);

    if (!slackWorkspace) {
      return {
        response_type: "ephemeral",
        text: "⚠️ Slack integration not configured. Please ask your admin to connect Trellis to Slack.",
      };
    }

    const { accessToken, workspaceId } = slackWorkspace;

    // Get Slack user info
    let slackUser;
    try {
      slackUser = await getSlackUserInfo(accessToken, userId);
    } catch (error) {
      console.error("Failed to get Slack user info:", error);
      return {
        response_type: "ephemeral",
        text: "⚠️ Failed to retrieve your Slack profile. Please try again.",
      };
    }

    if (!slackUser.email) {
      return {
        response_type: "ephemeral",
        text: "⚠️ Your Slack account doesn't have an email address. Please contact your admin.",
      };
    }

    // Find Trellis user with matching email in this workspace
    const [trellisUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, slackUser.email))
      .limit(1);

    if (!trellisUser) {
      return {
        response_type: "ephemeral",
        text: `⚠️ You haven't been invited to this Trellis workspace. Please contact your admin.\n\nYour email: ${slackUser.email}`,
      };
    }

    // Verify user belongs to the same workspace
    if (trellisUser.workspaceId !== workspaceId) {
      return {
        response_type: "ephemeral",
        text: "⚠️ Your Trellis account is in a different workspace. Please contact your admin.",
      };
    }

    // Fetch all users in the same workspace for the recipient dropdown
    const workspaceUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.workspaceId, workspaceId))
      .orderBy(users.name);

    // Filter out self (can't give feedback to yourself)
    const recipients = workspaceUsers.filter(u => u.id !== trellisUser.id);

    if (recipients.length === 0) {
      return {
        response_type: "ephemeral",
        text: "⚠️ No other users found in your workspace.",
      };
    }

    // Check if user mentioned someone in the command text (e.g., /submit @user)
    let preselectedUserId: string | undefined;
    let initialFeedbackText: string | undefined;

    if (text.trim()) {
      console.log("[Slack Command] Parsing command text:", text);

      // First, try to extract Slack user ID mention (rare in slash commands)
      const mentionedSlackUserId = extractUserIdFromMention(text);
      console.log("[Slack Command] Extracted Slack user ID:", mentionedSlackUserId);

      if (mentionedSlackUserId) {
        // Get mentioned user's email from Slack
        try {
          const mentionedSlackUser = await getSlackUserInfo(accessToken, mentionedSlackUserId);
          console.log("[Slack Command] Mentioned user email:", mentionedSlackUser.email);

          if (mentionedSlackUser.email) {
            // Find Trellis user with this email
            const [mentionedTrellisUser] = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.email, mentionedSlackUser.email),
                  eq(users.workspaceId, workspaceId)
                )
              )
              .limit(1);

            if (mentionedTrellisUser) {
              preselectedUserId = mentionedTrellisUser.id;
              console.log("[Slack Command] Pre-selected Trellis user (by Slack ID):", mentionedTrellisUser.name, mentionedTrellisUser.id);
            }
          }
        } catch (error) {
          console.error("[Slack Command] Failed to get mentioned user info:", error);
          // Continue to try name-based matching
        }
      }

      // If no Slack user ID found, try plain text name matching (e.g., @anna)
      if (!preselectedUserId) {
        const mentionedName = extractMentionedName(text);
        console.log("[Slack Command] Extracted plain text name:", mentionedName);

        if (mentionedName) {
          // Normalize name for searching: convert dots/hyphens to spaces
          // E.g., "alex.britten" -> "alex britten"
          const normalizedName = mentionedName.replace(/[._-]/g, " ");
          console.log("[Slack Command] Normalized name for search:", normalizedName);

          // Search for users whose name contains the mentioned name (case-insensitive)
          const matchingUsers = await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.workspaceId, workspaceId),
                ilike(users.name, `%${normalizedName}%`)
              )
            );

          console.log("[Slack Command] Found", matchingUsers.length, "matching users");

          // Only pre-select if exactly one match found
          if (matchingUsers.length === 1) {
            preselectedUserId = matchingUsers[0].id;
            console.log("[Slack Command] Pre-selected Trellis user (by name):", matchingUsers[0].name, matchingUsers[0].id);
          } else if (matchingUsers.length > 1) {
            console.log("[Slack Command] Multiple matches found, not pre-selecting:", matchingUsers.map(u => u.name).join(", "));
          } else {
            console.log("[Slack Command] No matching users found for name:", normalizedName);
          }
        }
      }

      // Extract feedback text if provided (e.g., /submit @user Great work!)
      initialFeedbackText = extractFeedbackText(text) || undefined;
      console.log("[Slack Command] Extracted feedback text:", initialFeedbackText);
    }

    // Build and open feedback modal
    const modal = buildFeedbackModal(recipients, preselectedUserId, initialFeedbackText);

    try {
      await openSlackModal(accessToken, triggerId, modal);

      // Return empty 200 response (modal already opened, no message needed)
      return "";
    } catch (error: any) {
      console.error("Failed to open modal:", error);
      return {
        response_type: "ephemeral",
        text: "⚠️ Failed to open feedback form. Please try again.",
      };
    }
  } catch (error: any) {
    console.error("Slack command error:", error);

    // Return user-friendly error
    return {
      response_type: "ephemeral",
      text: `⚠️ Something went wrong: ${error.message || "Unknown error"}`,
    };
  }
});
