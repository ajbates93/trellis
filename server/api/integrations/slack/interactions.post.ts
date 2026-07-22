import { db } from "#server/database/connection";
import { slackWorkspaces, users, feedback } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "#server/utils/encryption";
import { verifySlackSignature, getSlackUserInfo } from "#server/utils/slack";
import { format } from "date-fns";
import { notifyBuddyOfNewFeedback } from "#server/utils/notifications";

/**
 * Handle Slack modal interactions (submissions)
 * POST /api/integrations/slack/interactions
 */
export default defineEventHandler(async (event) => {
  try {
    // Read raw body for signature verification
    const body = await readRawBody(event);
    if (!body) {
      throw createError({
        statusCode: 400,
        message: "Missing request body",
      });
    }

    // Verify Slack signature
    if (!verifySlackSignature(event, body)) {
      throw createError({
        statusCode: 401,
        message: "Invalid Slack signature",
      });
    }

    // Parse URL-encoded form data
    const formData = new URLSearchParams(body);
    const payloadStr = formData.get("payload");

    if (!payloadStr) {
      throw createError({
        statusCode: 400,
        message: "Missing payload",
      });
    }

    const payload = JSON.parse(payloadStr);

    // Only handle view_submission (modal submission)
    if (payload.type !== "view_submission") {
      return {
        response_action: "clear",
      };
    }

    // Only handle feedback_submission callback
    if (payload.view?.callback_id !== "feedback_submission") {
      return {
        response_action: "clear",
      };
    }

    const userId = payload.user.id;
    const teamId = payload.team.id;

    // Extract form values from modal
    const values = payload.view.state.values;
    const recipientId = values.recipient_block?.recipient_select?.selected_option?.value;
    const feedbackContent = values.feedback_block?.feedback_input?.value;

    // Validate inputs
    if (!recipientId || !feedbackContent) {
      return {
        response_action: "errors",
        errors: {
          recipient_block: !recipientId ? "Please select a recipient" : undefined,
          feedback_block: !feedbackContent ? "Please enter feedback" : undefined,
        },
      };
    }

    // Validate feedback length (10-3000 characters, Slack modal limit)
    const trimmedContent = feedbackContent.trim();
    if (trimmedContent.length < 10) {
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Feedback must be at least 10 characters",
        },
      };
    }

    if (trimmedContent.length > 3000) {
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Feedback must be less than 3000 characters",
        },
      };
    }

    // Look up Slack workspace
    const [slackWorkspace] = await db
      .select()
      .from(slackWorkspaces)
      .where(eq(slackWorkspaces.slackTeamId, teamId))
      .limit(1);

    if (!slackWorkspace) {
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Slack workspace not found. Please contact your admin.",
        },
      };
    }

    const { accessToken: encryptedToken, workspaceId } = slackWorkspace;
    const accessToken = decrypt(encryptedToken);

    // Get Slack user info
    let slackUser;
    try {
      slackUser = await getSlackUserInfo(accessToken, userId);
    } catch (error) {
      console.error("Failed to get Slack user info:", error);
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Failed to retrieve your profile. Please try again.",
        },
      };
    }

    if (!slackUser.email) {
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Your Slack account doesn't have an email address.",
        },
      };
    }

    // Find Trellis reviewer with matching email
    const [reviewer] = await db
      .select()
      .from(users)
      .where(eq(users.email, slackUser.email))
      .limit(1);

    if (!reviewer || reviewer.workspaceId !== workspaceId) {
      return {
        response_action: "errors",
        errors: {
          feedback_block: "You haven't been invited to this workspace.",
        },
      };
    }

    // Verify reviewee exists and is in the same workspace (security check)
    const [reviewee] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, recipientId),
          eq(users.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!reviewee) {
      return {
        response_action: "errors",
        errors: {
          recipient_block: "Selected user not found in workspace.",
        },
      };
    }

    // Prevent self-review
    if (reviewer.id === reviewee.id) {
      return {
        response_action: "errors",
        errors: {
          recipient_block: "You cannot give feedback to yourself.",
        },
      };
    }

    // Calculate week-year format (e.g., "2025-W43")
    const now = new Date();
    const weekYear = format(now, "RRRR-'W'II");

    // Create feedback (as draft, unpublished)
    try {
      const [newFeedback] = await db
        .insert(feedback)
        .values({
          reviewerId: reviewer.id,
          revieweeId: reviewee.id,
          content: trimmedContent,
          weekYear,
          isRead: false,
          published: false, // Draft by default
        })
        .returning();

      // Notify buddy (fire-and-forget)
      notifyBuddyOfNewFeedback(reviewee.id);

      // Return success with confirmation message
      return {
        response_action: "update",
        view: {
          type: "modal",
          callback_id: "feedback_success",
          title: {
            type: "plain_text",
            text: "Success!",
          },
          close: {
            type: "plain_text",
            text: "Close",
          },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *Feedback submitted!*\n\nYour feedback for *${reviewee.name}* has been saved and will be reviewed by their buddy before being published.`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: "You can submit more feedback anytime with `/submit`",
                },
              ],
            },
          ],
        },
      };
    } catch (error: any) {
      console.error("Failed to create feedback:", error);
      return {
        response_action: "errors",
        errors: {
          feedback_block: "Failed to submit feedback. Please try again.",
        },
      };
    }
  } catch (error: any) {
    console.error("Slack interaction error:", error);

    // If we can't return a proper Slack response, throw error
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to process interaction",
    });
  }
});
