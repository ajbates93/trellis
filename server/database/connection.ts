import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { AsyncLocalStorage } from 'node:async_hooks'
import * as schema from './schema'

type Db = PostgresJsDatabase<typeof schema>

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Set it in your environment before starting the app.')
}

// Disable SSL for local development (localhost or sslmode=disable in URL)
const isLocal = connectionString.includes('localhost') || connectionString.includes('sslmode=disable')

export const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : 'require',
  max: isLocal ? 5 : 20,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
})

const baseDb: Db = drizzle(client, { schema })

// Request/task-scoped database handle. When a request runs inside
// withWorkspace()/withRlsBypass(), this store holds the transaction that
// carries the workspace context (set as Postgres GUCs); otherwise it is unset
// and queries use the base pool.
const scopeStore = new AsyncLocalStorage<Db>()

// The exported `db` transparently routes to the scoped transaction when one is
// active, and to the base pool otherwise. This lets every handler keep
// `import { db }` unchanged while row-level-security context is applied per
// request (see withWorkspace). Outside any scope (background work not wrapped
// in a helper, tests) it behaves exactly as the plain pooled client did.
export const db: Db = new Proxy(baseDb, {
  get(target, prop) {
    const scoped = scopeStore.getStore()
    const active = (scoped ?? target) as unknown as Record<PropertyKey, unknown>
    const value = Reflect.get(active, prop, active)
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(active)
      : value
  },
}) as Db

export interface WorkspaceContext {
  workspaceId: string | null
  isSuperAdmin?: boolean
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
      sql`select set_config('app.current_workspace_id', ${ctx.workspaceId ?? ''}, true)`,
    )
    await tx.execute(
      sql`select set_config('app.is_super_admin', ${ctx.isSuperAdmin ? 'on' : 'off'}, true)`,
    )
    return scopeStore.run(tx as unknown as Db, fn)
  })
}

/**
 * Run `fn` with the RLS super-admin bypass set, for work that legitimately
 * spans workspaces (scheduled tasks, platform super-admin routes). Uses the
 * same transaction + GUC mechanism so the bypass is explicit and auto-clearing.
 */
export async function withRlsBypass<T>(fn: () => Promise<T>): Promise<T> {
  return baseDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.is_super_admin', 'on', true)`)
    return scopeStore.run(tx as unknown as Db, fn)
  })
}
