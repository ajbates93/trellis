import {
  enterRequestScope,
  bindWorkspaceToScope,
  releaseRequestScope,
} from "#server/database/connection";

// Binds the caller's workspace to a dedicated database connection for the
// duration of the request, so that once row-level security is enabled every
// query the handler runs through `db` is filtered to that workspace.
//
// The `z-` prefix forces this to run after auth.ts (which populates
// event.context.user) and after the admin guards, so a request rejected by a
// guard never reserves a connection. Only authenticated requests are scoped;
// public routes (login, marketing, auth, demo) have no user and use the pool
// directly - the tables they touch are not under RLS.
//
// Until the RLS cutover this only sets a session setting nothing reads; it does
// add a reserved connection + two set_config round-trips per authenticated
// request, which is what the staging soak validates before RLS is enabled.
export default defineEventHandler(async (event) => {
  const user = event.context.user as
    | { workspaceId?: string | null; isSuperAdmin?: boolean }
    | undefined;

  if (!user) return;

  // Only API requests get a reserved connection. A server-rendered page reads
  // its data through internal $fetch calls to /api/*, each of which reserves
  // its own connection; reserving one for the page as well held a connection
  // idle while its child requests queued for the pool, so a handful of
  // concurrent page loads could exhaust it and deadlock every request after.
  if (!event.path.startsWith("/api/")) return;

  const scope = enterRequestScope();

  // Release when the response finishes or the connection closes. `close` always
  // fires (after `finish` on success, or on abort), and releaseRequestScope is
  // idempotent, so the reserved connection is never leaked.
  event.node.res.once("close", () => {
    void releaseRequestScope(scope);
  });

  await bindWorkspaceToScope(scope, {
    workspaceId: user.workspaceId ?? null,
    isSuperAdmin: user.isSuperAdmin === true,
  });
});
