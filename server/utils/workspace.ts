import type { H3Event } from "h3";

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
