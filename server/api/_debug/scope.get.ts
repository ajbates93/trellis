import { sql } from "drizzle-orm";
import { requireSuperAdmin } from "#server/utils/auth-guards";
import { getRequestScope, db } from "#server/database/connection";

// Soak-time diagnostic (super-admin only): confirms the per-request workspace
// scope set by the z-workspace-scope middleware actually reaches the handler's
// `db`. This is the one property the pre-RLS soak cannot otherwise observe -
// with RLS off, a failed propagation silently falls back to the pool and looks
// identical to success. If `scopedInHandler` is true here, the AsyncLocalStorage
// context is propagating correctly and the cutover is safe on that axis.
export default defineEventHandler(async (event) => {
  requireSuperAdmin(event);

  const scope = getRequestScope();
  const [row] = await db.execute<{ ws: string | null; sa: string | null }>(
    sql`select current_setting('app.current_workspace_id', true) as ws,
               current_setting('app.is_super_admin', true) as sa`,
  );

  return {
    scopedInHandler: Boolean(scope?.db),
    workspaceGucInHandler: row?.ws || null,
    superAdminGucInHandler: row?.sa || null,
  };
});
