export default defineEventHandler(async () => {
  const result = await runTask("review-reminders");
  return { success: true, result };
});
