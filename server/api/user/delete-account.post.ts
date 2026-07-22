import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import { assertNotSoleAdmin, anonymizeUser } from "#server/utils/accountDeletion";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const workspaceId = getWorkspaceId(event);
  await assertNotSoleAdmin(session.user.id, workspaceId);
  await anonymizeUser(session.user.id);
  return validateResponse({ success: true }, apiSchemas.SuccessResponseSchema);
});
