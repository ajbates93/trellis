import { requireAdmin } from "#server/utils/auth-guards";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  // Scope the manual trigger to the calling admin's workspace. Previously this
  // ran the task with no arguments, so any workspace admin could send reminder
  // emails to every tenant and flip the "reminder sent" flags platform-wide,
  // suppressing other tenants' legitimately scheduled reminders (F14). The
  // scheduled cron run remains platform-wide by design.
  requireAdmin(event);
  const workspaceId = getWorkspaceId(event);

  const result = await runTask("review-reminders", {
    payload: { workspaceId },
  });
  return { success: true, result };
});
