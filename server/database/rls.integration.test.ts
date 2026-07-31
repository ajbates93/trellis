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
    await db.execute(
      sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO ${TEST_ROLE};`),
    );
    await db.execute(sql.raw(`ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;`));
    await db.execute(
      sql.raw(`
        CREATE POLICY tenant_isolation ON feedback
          USING (workspace_id = current_setting('app.current_workspace_id', true)
                 OR current_setting('app.is_super_admin', true) = 'on')
          WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)
                 OR current_setting('app.is_super_admin', true) = 'on');
      `),
    );

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
    await db.execute(sql.raw(`DROP POLICY IF EXISTS tenant_isolation ON feedback;`)).catch(() => {});
    await db.execute(sql.raw(`ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;`)).catch(() => {});
    await db.execute(sql.raw(`DROP OWNED BY ${TEST_ROLE};`)).catch(() => {});
    await db.execute(sql.raw(`DROP ROLE IF EXISTS ${TEST_ROLE};`)).catch(() => {});
    await db.execute(sql.raw(`DELETE FROM feedback WHERE reviewer_id = 'r';`)).catch(() => {});
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
});
