import type { H3Event } from "h3";
import type { users } from "#server/database/schema";

/**
 * The authenticated user attached to the event context by the auth middleware
 * (`server/middleware/auth.ts`). This is the application's own user row shape,
 * the single source of truth for the fields handlers read (role, workspaceId,
 * isSuperAdmin, buddyId, ...).
 */
export type AuthUser = typeof users.$inferSelect;

/**
 * Require an authenticated session and return the typed user.
 *
 * The auth middleware already rejects unauthenticated requests to `/api/*`, so
 * this is defence in depth plus type narrowing: handlers get a non-null,
 * typed user instead of re-deriving it from `event.context` by hand. Replaces
 * the ~80 hand-rolled `if (!session?.user) throw 401` blocks that had drifted
 * into several message variants.
 */
export function requireUser(event: H3Event): AuthUser {
  const user = (event.context.user ?? event.context.session?.user) as
    | AuthUser
    | undefined;

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  return user;
}

/**
 * Require an authenticated user with the workspace-admin role.
 *
 * Preserves the existing authorisation semantics exactly (`role === "admin"`),
 * matching the `z-admin` middleware that already gates `/api/admin/*`. Super
 * admins are intentionally not granted admin access here; use
 * {@link requireSuperAdmin} for platform-level routes.
 */
export function requireAdmin(event: H3Event): AuthUser {
  const user = requireUser(event);

  if (user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Admin access required",
    });
  }

  return user;
}

/**
 * Require an authenticated platform super admin (`isSuperAdmin === true`),
 * matching the `z-super-admin` middleware that gates `/api/super-admin/*`.
 */
export function requireSuperAdmin(event: H3Event): AuthUser {
  const user = requireUser(event);

  if (user.isSuperAdmin !== true) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  return user;
}
