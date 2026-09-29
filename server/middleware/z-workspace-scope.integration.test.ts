import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { sql } from "drizzle-orm";
import handler from "./z-workspace-scope";
import { getRequestScope, db } from "#server/database/connection";

// Proves the real middleware, against a real database, binds a request scope
// that is visible to code running afterwards in the same async context - i.e.
// the middleware -> handler propagation the RLS cutover depends on. (h3 runs
// server middleware and the route handler within one request async context, so
// "code after the middleware" here stands in for the route handler.)
describe("z-workspace-scope middleware (integration, real scope)", () => {
  function mockEvent(user: unknown) {
    const res = new EventEmitter();
    return { event: { path: "/api/goals", context: { user }, node: { res } }, res };
  }

  it("binds the workspace so a later query in the same context is scoped", async () => {
    const { event, res } = mockEvent({
      workspaceId: "ws-mw",
      isSuperAdmin: false,
    });

    await handler(event as never);

    // "route handler" continuation: the scope is visible and db is routed to it.
    const scope = getRequestScope();
    expect(scope?.db).toBeDefined();

    const [row] = await db.execute<{ ws: string }>(
      sql`select current_setting('app.current_workspace_id', true) as ws`,
    );
    expect(row?.ws).toBe("ws-mw");

    // Response close releases the reserved connection; the scope db is cleared.
    res.emit("close");
    await new Promise((r) => setTimeout(r, 20));
    expect(getRequestScope()?.db).toBeUndefined();
  });

  it("leaves unauthenticated requests unscoped", async () => {
    const { event } = mockEvent(undefined);
    await handler(event as never);
    expect(getRequestScope()?.db).toBeUndefined();
  });
});
