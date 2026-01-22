/**
 * DEBUG ENDPOINT - Remove after testing
 * GET /api/debug/config
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  return {
    slackClientId: config.slackClientId ? `${config.slackClientId.substring(0, 10)}...` : "NOT SET",
    slackClientSecretSet: !!config.slackClientSecret,
    slackSigningSecretSet: !!config.slackSigningSecret,
    betterAuthUrl: config.betterAuthUrl || "NOT SET",
    publicBaseUrl: config.public.baseUrl || "NOT SET",
  };
});
