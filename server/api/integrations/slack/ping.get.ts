/**
 * Simple ping endpoint to test Slack integration is deployed
 * GET /api/integrations/slack/ping
 */
export default defineEventHandler(() => {
  console.log("[Slack Ping] Endpoint hit successfully");
  return {
    status: "ok",
    message: "Slack integration endpoints are deployed",
    timestamp: new Date().toISOString(),
  };
});
