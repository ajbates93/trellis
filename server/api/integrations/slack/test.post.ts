/**
 * Test POST endpoint - no auth, just logs
 * POST /api/integrations/slack/test
 */
export default defineEventHandler(async (event) => {
  console.log("========== TEST POST ENDPOINT HIT ==========");
  console.log("Method:", event.method);
  console.log("Headers:", getHeaders(event));

  const body = await readRawBody(event);
  console.log("Body received:", body);

  return {
    status: "ok",
    message: "POST endpoint working",
    receivedBody: body || "no body",
    timestamp: new Date().toISOString(),
  };
});
