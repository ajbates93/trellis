/**
 * DEBUG ENDPOINT - Check Slack configuration
 * GET /api/debug/slack-config
 */
export default defineEventHandler(() => {
  const config = useRuntimeConfig();

  return {
    slackClientId: config.slackClientId ? `${config.slackClientId.substring(0, 15)}...` : "NOT SET",
    slackClientSecretSet: !!config.slackClientSecret && config.slackClientSecret.length > 0,
    slackSigningSecretSet: !!config.slackSigningSecret && config.slackSigningSecret.length > 0,
    betterAuthUrl: config.betterAuthUrl || "NOT SET",
    publicBaseUrl: config.public.baseUrl || "NOT SET",

    // Show actual values (remove after debugging)
    actualSigningSecret: config.slackSigningSecret ? `${config.slackSigningSecret.substring(0, 8)}...` : "MISSING",
  };
});
