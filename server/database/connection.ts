import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Set it in your environment before starting the app.",
  );
}

// Disable SSL for local development (localhost or sslmode=disable in URL)
const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("sslmode=disable");

export const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : "require",
  max: isLocal ? 5 : 20,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

const baseDb: Db = drizzle(client, { schema });

// A mutable per-request/per-task scope. `db` (below) routes to `scope.db` when
// one is present, else the base pool. It is a mutable holder rather than a bare
// Db so the request plugin can establish an empty scope up front and the
// post-auth middleware can populate it once the caller's workspace is known
// (see server/plugins/request-scope.ts and server/middleware/z-workspace-scope.ts).
export interface DbScope {
  db?: Db;
  release?: () => Promise<void>;
}

const scopeStore = new AsyncLocalStorage<DbScope>();

// The exported `db` transparently routes to the scoped connection when one is
// active, and to the base pool otherwise. This lets every handler keep
// `import { db }` unchanged while row-level-security context is applied per
// request. Outside any scope (background work not wrapped in a helper, tests,
// or a lingering-but-cleared scope) it behaves exactly as the plain pooled
// client did.
export const db: Db = new Proxy(baseDb, {
  get(target, prop) {
    const scoped = scopeStore.getStore()?.db;
    const active = (scoped ?? target) as unknown as Record<
      PropertyKey,
      unknown
    >;
    const value = Reflect.get(active, prop, active);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(active)
      : value;
  },
}) as Db;

export interface WorkspaceContext {
  workspaceId: string | null;
  isSuperAdmin?: boolean;
}

/**
 * Run `fn` with the caller's workspace bound as Postgres session settings on a
 * dedicated transaction, so that once row-level security is enabled every query
 * `fn` issues through `db` is filtered to that workspace.
 *
 * `set_config(..., true)` is transaction-local and clears automatically on
 * commit/rollback, so a pooled connection can never leak one request's context
 * into the next. Note: because this holds the transaction (and its connection)
 * for the duration of `fn`, handlers that interleave slow external I/O (LLM,
 * email, S3) should keep that work outside the wrapped DB block.
 *
 * RLS is not yet enabled in any environment. Until the cutover, this only sets
 * a session setting nothing reads - there is no behaviour change.
 */
export async function withWorkspace<T>(
  ctx: WorkspaceContext,
  fn: () => Promise<T>,
): Promise<T> {
  return baseDb.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_workspace_id', ${ctx.workspaceId ?? ""}, true)`,
    );
    await tx.execute(
      sql`select set_config('app.is_super_admin', ${ctx.isSuperAdmin ? "on" : "off"}, true)`,
    );
    return scopeStore.run({ db: tx as unknown as Db }, fn);
  });
}

/**
 * Run `fn` with the RLS super-admin bypass set, for work that legitimately
 * spans workspaces (scheduled tasks, platform super-admin routes). Uses the
 * same transaction + GUC mechanism so the bypass is explicit and auto-clearing.
 */
export async function withRlsBypass<T>(fn: () => Promise<T>): Promise<T> {
  return baseDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.is_super_admin', 'on', true)`);
    return scopeStore.run({ db: tx as unknown as Db }, fn);
  });
}

// ---------------------------------------------------------------------------
// Per-request scope wiring (used by the request plugin + workspace middleware).
//
// Unlike withWorkspace(), which opens a short transaction for programmatic use,
// an HTTP request cannot be wrapped in a single callback from Nitro middleware,
// and several handlers do slow external I/O (LLM, email, S3) that must not be
// held inside a DB transaction. So a request instead reserves a dedicated
// pooled connection and sets the workspace as SESSION settings on it (no long
// transaction, no locks held during external calls); the connection is reset
// (DISCARD ALL) and released when the request ends.
// ---------------------------------------------------------------------------

/**
 * Establish an empty scope for the current request and bind it to the async
 * context so the post-auth middleware can populate it and `db` can read it.
 * Called from the request plugin before any handler/middleware runs.
 */
export function enterRequestScope(): DbScope {
  const scope: DbScope = {};
  scopeStore.enterWith(scope);
  return scope;
}

/** The scope bound to the current async context, if any. */
export function getRequestScope(): DbScope | undefined {
  return scopeStore.getStore();
}

/**
 * Reserve a dedicated connection, set the caller's workspace context on it as
 * session settings, and populate `scope` so `db` routes through it. Idempotent
 * per scope (a second call is a no-op once bound).
 */
export async function bindWorkspaceToScope(
  scope: DbScope,
  ctx: WorkspaceContext,
): Promise<void> {
  if (scope.db) return;

  const reserved = await client.reserve();
  try {
    await reserved`select set_config('app.current_workspace_id', ${ctx.workspaceId ?? ""}, false)`;
    await reserved`select set_config('app.is_super_admin', ${ctx.isSuperAdmin ? "on" : "off"}, false)`;

    // A reserved connection does not carry the `.options` (parsers/serializers)
    // that drizzle's postgres-js driver reads; point it at the base client's,
    // already initialised by baseDb. Queries then run on this pinned connection.
    (reserved as unknown as { options: unknown }).options = client.options;
    scope.db = drizzle(reserved, { schema });
  } catch (error) {
    // Any failure after reserving must return the connection to the pool.
    reserved.release();
    throw error;
  }

  scope.release = async () => {
    // Clear the routed db first, so even if the async context lingers past
    // release, `db` falls back to the pool rather than a released connection.
    scope.db = undefined;
    try {
      await reserved`discard all`;
    } catch {
      // Best effort: a broken connection is dropped by the driver on release.
    } finally {
      reserved.release();
    }
  };
}

/** Release the request's reserved connection, if one was bound. Idempotent. */
export async function releaseRequestScope(
  scope: DbScope | undefined,
): Promise<void> {
  const release = scope?.release;
  if (release) {
    scope.release = undefined;
    await release();
  }
}
