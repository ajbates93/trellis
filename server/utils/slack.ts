import { createHmac, timingSafeEqual } from "crypto";
import type { H3Event } from "h3";

/**
 * Verify Slack request signature
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(event: H3Event, body: string): boolean {
  const config = useRuntimeConfig();
  const signingSecret = config.slackSigningSecret;

  if (!signingSecret) {
    console.error("SLACK_SIGNING_SECRET not configured");
    return false;
  }

  const slackSignature = getHeader(event, "x-slack-signature");
  const slackTimestamp = getHeader(event, "x-slack-request-timestamp");

  if (!slackSignature || !slackTimestamp) {
    return false;
  }

  // Prevent replay attacks - reject requests older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(slackTimestamp, 10);
  if (Math.abs(currentTime - requestTime) > 300) {
    console.warn("Slack request timestamp too old");
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${slackTimestamp}:${body}`;
  const expectedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(sigBasestring)
    .digest("hex")}`;

  // Timing-safe comparison
  try {
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(slackSignature);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Get Slack user info by user ID
 */
export async function getSlackUserInfo(accessToken: string, userId: string) {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      id: data.user.id,
      email: data.user.profile?.email,
      name: data.user.real_name || data.user.name,
    };
  } catch (error) {
    console.error("Failed to get Slack user info:", error);
    throw error;
  }
}

/**
 * Get Slack team info
 */
export async function getSlackTeamInfo(accessToken: string) {
  try {
    const response = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      id: data.team.id,
      name: data.team.name,
    };
  } catch (error) {
    console.error("Failed to get Slack team info:", error);
    throw error;
  }
}

/**
 * Open a modal view in Slack
 */
export async function openSlackModal(
  accessToken: string,
  triggerId: string,
  view: any
) {
  try {
    const payload = {
      trigger_id: triggerId,
      view,
    };

    const response = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error("Failed to open Slack modal:", error);
    throw error;
  }
}

/**
 * Post a message to Slack user (ephemeral)
 */
export async function postEphemeralMessage(
  accessToken: string,
  channel: string,
  user: string,
  text: string
) {
  try {
    const response = await fetch("https://slack.com/api/chat.postEphemeral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        user,
        text,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  } catch (error) {
    console.error("Failed to post ephemeral message:", error);
    throw error;
  }
}

/**
 * Build feedback modal view for Slack
 */
export function buildFeedbackModal(
  recipients: Array<{ id: string; name: string }>,
  preselectedUserId?: string,
  initialFeedbackText?: string
) {
  // Find preselected user if provided
  const preselectedUser = preselectedUserId
    ? recipients.find(r => r.id === preselectedUserId)
    : undefined;

  // Build select element
  const selectElement: any = {
    type: "static_select",
    action_id: "recipient_select",
    placeholder: {
      type: "plain_text",
      text: "Select a team member",
    },
    options: recipients.map(recipient => ({
      text: {
        type: "plain_text",
        text: recipient.name,
      },
      value: recipient.id,
    })),
  };

  // Only set initial_option if preselected user exists in recipients
  if (preselectedUser) {
    selectElement.initial_option = {
      text: {
        type: "plain_text",
        text: preselectedUser.name,
      },
      value: preselectedUser.id,
    };
  }

  return {
    type: "modal",
    callback_id: "feedback_submission",
    title: {
      type: "plain_text",
      text: "Give Feedback",
    },
    submit: {
      type: "plain_text",
      text: "Submit",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "input",
        block_id: "recipient_block",
        label: {
          type: "plain_text",
          text: "Recipient",
        },
        element: selectElement,
      },
      {
        type: "input",
        block_id: "feedback_block",
        label: {
          type: "plain_text",
          text: "Your Feedback",
        },
        hint: {
          type: "plain_text",
          text: "Be specific about what they did well and the impact it had.",
        },
        element: {
          type: "plain_text_input",
          action_id: "feedback_input",
          multiline: true,
          min_length: 10,
          max_length: 3000,
          placeholder: {
            type: "plain_text",
            text: "Great work on...",
          },
          ...(initialFeedbackText && { initial_value: initialFeedbackText }),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Your feedback will be saved as a draft. Your buddy will publish it later.",
          },
        ],
      },
    ],
  };
}

/**
 * Extract user mention from Slack command text (e.g., "@U12345" or "<@U12345>")
 * For proper Slack mentions (rare in slash commands)
 */
export function extractUserIdFromMention(text: string): string | null {
  // Match <@U12345> or <@U12345|username>
  const match = text.match(/<@([A-Z0-9]+)(?:\|[^>]+)?>/);
  if (match) {
    return match[1] ?? null;
  }

  // Match plain @U12345 (Slack user ID format)
  const plainMatch = text.match(/@(U[A-Z0-9]+)/);
  if (plainMatch) {
    return plainMatch[1] ?? null;
  }

  return null;
}

/**
 * Extract plain text name from @mention
 * Supports: @anna, @anna.smith, @Alex Britten (with spaces)
 *
 * Strategy:
 * - Single lowercase word: @anna, @john
 * - Capitalized names (multiple words): @Anna Smith, @Alex Britten
 * - Dotted/hyphenated: @anna.smith, @john-doe
 */
export function extractMentionedName(text: string): string | null {
  // Match either:
  // 1. Capitalized name(s): @Anna, @Anna Smith, @Anna Marie Smith
  //    Pattern: One or more capitalized words (stops at lowercase words like "is", "has")
  // 2. Single lowercase word: @anna
  // 3. Dotted/hyphenated: @anna.smith, @john-doe
  const capitalizedMatch = text.match(/@([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/);
  if (capitalizedMatch?.[1]) {
    return capitalizedMatch[1].trim();
  }

  // Try lowercase with dots/hyphens
  const dottedMatch = text.match(/@([a-z]+(?:[._-][a-z]+)*)/);
  if (dottedMatch?.[1]) {
    return dottedMatch[1].trim();
  }

  // Try simple lowercase word
  const lowercaseMatch = text.match(/@([a-z]+)/);
  if (lowercaseMatch?.[1]) {
    return lowercaseMatch[1].trim();
  }

  return null;
}

/**
 * Extract feedback text from command after the user mention
 * E.g., "/submit @user Great work!" returns "Great work!"
 * E.g., "/submit @Alex Britten Great work!" returns "Great work!"
 */
export function extractFeedbackText(text: string): string | null {
  // Remove Slack user ID mentions: <@U12345> or <@U12345|username>
  let cleanText = text.replace(/<@[A-Z0-9]+(?:\|[^>]+)?>/g, "").trim();

  // Remove plain text @mentions using same logic as extractMentionedName
  // 1. Remove capitalized names: @Anna, @Anna Smith, @Alex Britten
  cleanText = cleanText.replace(/@[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g, "").trim();

  // 2. Remove dotted/hyphenated names: @anna.smith, @john-doe
  cleanText = cleanText.replace(/@[a-z]+(?:[._-][a-z]+)*/g, "").trim();

  // 3. Remove simple lowercase mentions: @anna, @john
  cleanText = cleanText.replace(/@[a-z]+/g, "").trim();

  return cleanText.length > 0 ? cleanText : null;
}

/**
 * Cookie carrying the Slack install nonce (F6). Set when an admin starts the
 * OAuth install, required to match the state's nonce at the callback and
 * cleared there (single-use), so a captured state value cannot be completed
 * from any session other than the one that initiated the install.
 */
export const SLACK_INSTALL_NONCE_COOKIE = "slack_install_nonce";
