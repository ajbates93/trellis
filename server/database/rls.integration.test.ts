import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import {
  db,
  withWorkspace,
  withRlsBypass,
  enterRequestScope,
  bindWorkspaceToScope,
  releaseRequestScope,
} from "./connection";

// Two-layer proof of the row-level-security plumbing:
//
//  1. withWorkspace()/withRlsBypass() set the workspace GUCs on the scoped
//     transaction, and the `db` proxy routes queries onto it. Verified via the
//     module's own db (runs as the superuser test role; RLS not exercised here,
//     only that the context is set on the connection db uses).
//
//  2. The same transaction + set_config mechanism, exercised against a real
//     NON-superuser role with an RLS policy, actually enforces isolation - the
//     property the production cutover depends on (the app will connect as such
//     a role). This is the automated version of the manual PoC.
//
// Nothing wires this into request handling yet and RLS is not enabled on the
// app's own connection, so there is no behaviour change in the app.

const TEST_ROLE = "trellis_rls_test_role";
const TEST_PW = "rls_test_pw";

describe("RLS plumbing: db proxy + withWorkspace set workspace context", () => {
  it("db has no workspace context outside withWorkspace", async () => {
    const [row] = await db.execute<{ ws: string | null }>(
      sql`select current_setting('app.current_workspace_id', true) as ws`,
    );
    // Unset -> empty string or null (never a real workspace id).
    expect(row?.ws == null || row.ws === "").toBe(true);
  });

  it("withWorkspace binds the workspace id onto the connection db uses", async () => {
    const seen = await withWorkspace({ workspaceId: "ws-xyz" }, async () => {
      const [row] = await db.execute<{ ws: string }>(
        sql`select current_setting('app.current_workspace_id', true) as ws`,
      );
      return row?.ws;
    });
    expect(seen).toBe("ws-xyz");
  });

  it("clears the context again after withWorkspace returns", async () => {
    await withWorkspace({ workspaceId: "ws-xyz" }, async () => {});
    const [row] = await db.execute<{ ws: string | null }>(
      sql`select current_setting('app.current_workspace_id', true) as ws`,
    );
    expect(row?.ws == null || row.ws === "").toBe(true);
  });

  it("withRlsBypass sets the super-admin flag", async () => {
    const seen = await withRlsBypass(async () => {
      const [row] = await db.execute<{ sa: string }>(
        sql`select current_setting('app.is_super_admin', true) as sa`,
      );
      return row?.sa;
    });
    expect(seen).toBe("on");
  });
});

describe("request-scope primitives (reserve / bind / release)", () => {
  it("routes db through a reserved connection carrying the workspace, then falls back after release", async () => {
    const scope = enterRequestScope();
    try {
      await bindWorkspaceToScope(scope, {
        workspaceId: "ws-req",
        isSuperAdmin: false,
      });
      const [bound] = await db.execute<{ ws: string }>(
        sql`select current_setting('app.current_workspace_id', true) as ws`,
      );
      expect(bound?.ws).toBe("ws-req");
    } finally {
      await releaseRequestScope(scope);
    }

    // After release the scope is cleared, so db uses the base pool again.
    const [after] = await db.execute<{ ws: string | null }>(
      sql`select current_setting('app.current_workspace_id', true) as ws`,
    );
    expect(after?.ws == null || after.ws === "").toBe(true);
  });

  it("binds the super-admin flag when requested", async () => {
    const scope = enterRequestScope();
    try {
      await bindWorkspaceToScope(scope, {
        workspaceId: null,
        isSuperAdmin: true,
      });
      const [row] = await db.execute<{ sa: string }>(
        sql`select current_setting('app.is_super_admin', true) as sa`,
      );
      expect(row?.sa).toBe("on");
    } finally {
      await releaseRequestScope(scope);
    }
  });
});

describe("RLS enforcement against a real non-superuser role", () => {
  let appSql: postgres.Sql;

  beforeAll(async () => {
    // Superuser setup: a non-superuser role, a policy on feedback, seed rows.
    await db.execute(sql.raw(`
      DROP OWNED BY ${TEST_ROLE};
    `)).catch(() => {});
    await db.execute(sql.raw(`DROP ROLE IF EXISTS ${TEST_ROLE};`)).catch(() => {});
    await db.execute(
      sql.raw(
        `CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${TEST_PW}' NOSUPERUSER NOBYPASSRLS;`,
      ),
    );
    // feedback + goals stand in for the ten content tables: they exercise both
    // the explicit-workspace_id path and the column-DEFAULT path (goals inserts
    // in the tests below omit workspace_id, as the real handlers do).
    for (const table of ["feedback", "goals"]) {
      await db.execute(
        sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${TEST_ROLE};`),
      );
      await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
      await db.execute(
        sql.raw(`
          CREATE POLICY tenant_isolation ON ${table}
            USING (workspace_id = current_setting('app.current_workspace_id', true)
                   OR current_setting('app.is_super_admin', true) = 'on')
            WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
                   OR current_setting('app.is_super_admin', true) = 'on');
        `),
      );
    }

    // A connection as the non-superuser role (RLS applies to it).
    const url = process.env.DATABASE_URL as string;
    const parsed = new URL(url);
    appSql = postgres({
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.slice(1),
      username: TEST_ROLE,
      password: TEST_PW,
      ssl: false,
      max: 2,
    });
  });

  // The integration harness truncates every table before each test, so seed the
  // data here (this runs after that global truncate). As superuser, RLS is
  // bypassed for setup. Two feedback rows in wsA, one in wsB.
  beforeEach(async () => {
    await db.execute(sql.raw(`
      INSERT INTO workspaces (id, name) VALUES ('wsA','A'), ('wsB','B');
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES
        ('r','r@x.io','R', now(), now()),
        ('e','e@x.io','E', now(), now());
      INSERT INTO feedback (workspace_id, reviewer_id, reviewee_id, content, week_year)
      VALUES ('wsA','r','e','A1','2025-W01'),
             ('wsA','r','e','A2','2025-W01'),
             ('wsB','r','e','B1','2025-W01');
    `));
  });

  afterAll(async () => {
    await appSql?.end().catch(() => {});
    for (const table of ["feedback", "goals"]) {
      await db.execute(sql.raw(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`)).catch(() => {});
      await db.execute(sql.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`)).catch(() => {});
    }
    await db.execute(sql.raw(`DROP OWNED BY ${TEST_ROLE};`)).catch(() => {});
    await db.execute(sql.raw(`DROP ROLE IF EXISTS ${TEST_ROLE};`)).catch(() => {});
    await db.execute(sql.raw(`DELETE FROM feedback WHERE reviewer_id = 'r';`)).catch(() => {});
    await db.execute(sql.raw(`DELETE FROM goals WHERE user_id IN ('r','e');`)).catch(() => {});
  });

  async function countAsApp(setup: (tx: postgres.TransactionSql) => Promise<void>) {
    return appSql.begin(async (tx) => {
      await setup(tx);
      const rows = await tx`select count(*)::int as c from feedback`;
      return rows[0]!.c as number;
    });
  }

  it("sees no rows with no workspace context (fail closed)", async () => {
    const c = await countAsApp(async () => {});
    expect(c).toBe(0);
  });

  it("sees only its own workspace when scoped", async () => {
    const c = await countAsApp(async (tx) => {
      await tx`select set_config('app.current_workspace_id', 'wsA', true)`;
    });
    expect(c).toBe(2);
  });

  it("sees all workspaces with the super-admin bypass", async () => {
    const c = await countAsApp(async (tx) => {
      await tx`select set_config('app.is_super_admin', 'on', true)`;
    });
    expect(c).toBe(3);
  });

  it("cannot write a row into another workspace", async () => {
    await expect(
      appSql.begin(async (tx) => {
        await tx`select set_config('app.current_workspace_id', 'wsA', true)`;
        await tx`insert into feedback (workspace_id, reviewer_id, reviewee_id, content, week_year)
                 values ('wsB','r','e','evil','2025-W01')`;
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  // The prep step (migration 0024) gives the content tables a column DEFAULT
  // that reads `app.current_workspace_id`. These prove that mechanism end-to-end
  // under the restricted role: a handler that inserts WITHOUT a workspace_id (as
  // all the request-scoped handlers do) has the row stamped with, and confined
  // to, the caller's workspace - and an insert with no context fails closed.
  it("stamps an omitted workspace_id from the session context (feedback)", async () => {
    const ws = await appSql.begin(async (tx) => {
      await tx`select set_config('app.current_workspace_id', 'wsA', true)`;
      const rows = await tx`
        insert into feedback (reviewer_id, reviewee_id, content, week_year)
        values ('r','e','F-default','2025-W02')
        returning workspace_id`;
      return rows[0]!.workspace_id as string;
    });
    expect(ws).toBe("wsA");
  });

  it("stamps an omitted workspace_id from the session context (goals)", async () => {
    const ws = await appSql.begin(async (tx) => {
      await tx`select set_config('app.current_workspace_id', 'wsB', true)`;
      const rows = await tx`
        insert into goals (user_id, goal_text)
        values ('e','G-default')
        returning workspace_id`;
      return rows[0]!.workspace_id as string;
    });
    expect(ws).toBe("wsB");
  });

  it("confines a default-stamped row to its workspace", async () => {
    // Insert under wsA with no explicit workspace_id.
    await appSql.begin(async (tx) => {
      await tx`select set_config('app.current_workspace_id', 'wsA', true)`;
      await tx`insert into goals (user_id, goal_text) values ('e','only-wsA')`;
    });

    const countIn = async (ws: string) =>
      appSql.begin(async (tx) => {
        await tx`select set_config('app.current_workspace_id', ${ws}, true)`;
        const rows = await tx`select count(*)::int as c from goals`;
        return rows[0]!.c as number;
      });

    expect(await countIn("wsA")).toBe(1);
    expect(await countIn("wsB")).toBe(0);
  });

  it("rejects an insert made with no workspace context (fail closed)", async () => {
    // A brand-new connection that has never set the workspace GUC: current_setting
    // returns NULL, so the DEFAULT resolves to NULL and the RLS WITH CHECK rejects
    // the write. A fresh client is used deliberately: a *reused* pooled connection
    // that previously ran a transaction-local set_config reverts the custom GUC to
    // '' (empty), not NULL, on commit - which would trip the workspace FK instead.
    // Production avoids that by resetting released connections with DISCARD ALL,
    // so an unscoped app connection is always in this NULL state.
    const parsed = new URL(process.env.DATABASE_URL as string);
    const fresh = postgres({
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      database: parsed.pathname.slice(1),
      username: TEST_ROLE,
      password: TEST_PW,
      ssl: false,
      max: 1,
    });
    try {
      await expect(
        fresh.begin(async (tx) => {
          await tx`insert into goals (user_id, goal_text) values ('e','no-context')`;
        }),
      ).rejects.toThrow(/row-level security/i);
    } finally {
      await fresh.end().catch(() => {});
    }
  });
});
