import type { H3Event } from "h3";
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";

/**
 * Get the workspace ID from the current event context.
 * Throws a 403 error if no workspace context is available.
 */
export function getWorkspaceId(event: H3Event): string {
  const workspaceId = event.context.user?.workspaceId;
  if (!workspaceId) {
    throw createError({
      statusCode: 403,
      message: "No workspace context",
    });
  }
  return workspaceId;
}

/**
 * Check if the current user is a super admin.
 * Returns false if no user context is available.
 */
export function isSuperAdmin(event: H3Event): boolean {
  return event.context.user?.isSuperAdmin === true;
}

/**
 * Assert that the target user belongs to the caller's workspace.
 *
 * Tenant isolation is enforced only in application code (the core content
 * tables carry no workspaceId column), so any endpoint that lets an admin act
 * on an arbitrary userId MUST call this before touching that user's data.
 * Without it, a workspace admin can read/mutate another tenant's rows by
 * passing a foreign userId. Throws 403 if the target is missing or in a
 * different workspace.
 */
export async function assertSameWorkspace(
  event: H3Event,
  targetUserId: string,
): Promise<void> {
  const callerWorkspaceId = getWorkspaceId(event);

  const [target] = await db
    .select({ workspaceId: users.workspaceId })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target || target.workspaceId !== callerWorkspaceId) {
    throw createError({
      statusCode: 403,
      message: "You do not have permission to access this resource",
    });
  }
}
