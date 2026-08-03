import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import { assertNotSoleAdmin, anonymizeUser } from "#server/utils/accountDeletion";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const workspaceId = getWorkspaceId(event);
  await assertNotSoleAdmin(user.id, workspaceId);
  await anonymizeUser(user.id);
  return validateResponse({ success: true }, apiSchemas.SuccessResponseSchema);
});
