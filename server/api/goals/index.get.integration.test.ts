import { describe, it, expect } from "vitest";
import handler from "./index.get";
import {
  seedWorkspace,
  seedUser,
  seedGoal,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// Integration tier (real Postgres). This is precisely the class of regression
// the mocked unit suite cannot catch: the mock DB ignores the `where` predicate
// and assertSameWorkspace is never exercised against real rows, so a handler
// that dropped its workspace check would still pass there. Here it does not.
describe("GET /api/goals (integration, real query layer)", () => {
  it("blocks an admin from reading a user in another workspace (cross-tenant read returns nothing)", async () => {
    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const adminA = await seedUser({ role: "admin", workspaceId: wsA.id });
    const userB = await seedUser({ workspaceId: wsB.id });
    await seedGoal(userB.id, { goalText: "Confidential goal in workspace B" });

    const event = createIntegrationEvent({
      method: "GET",
      path: "/api/goals",
      query: { userId: userB.id },
      user: adminA,
    });

    // The boundary must DENY the read - workspace B's goals must never be
    // returned to a workspace A admin. We assert denial (it throws, returns no
    // data) rather than a specific status: the handler's catch-all currently
    // re-labels the 403 from assertSameWorkspace as a 500 (that is CQ-1), so
    // pinning 403 here would fail until CQ-1 lands and pinning 500 would
    // enshrine the bug. The clean 403 is asserted on assertSameWorkspace
    // directly in server/utils/workspace.integration.test.ts.
    await expect(handler(event)).rejects.toBeDefined();
  });

  it("allows an admin to read a user in their own workspace", async () => {
    const wsA = await seedWorkspace();
    const adminA = await seedUser({ role: "admin", workspaceId: wsA.id });
    const memberA = await seedUser({ workspaceId: wsA.id });
    await seedGoal(memberA.id, { goalText: "A goal within workspace A" });

    const event = createIntegrationEvent({
      method: "GET",
      path: "/api/goals",
      query: { userId: memberA.id },
      user: adminA,
    });

    const result = (await handler(event)) as { goals: unknown[] };
    expect(result.goals).toHaveLength(1);
  });

  it("returns the caller's own goals without a userId query", async () => {
    const wsA = await seedWorkspace();
    const memberA = await seedUser({ workspaceId: wsA.id });
    await seedGoal(memberA.id, { goalText: "My own development goal" });

    const event = createIntegrationEvent({
      method: "GET",
      path: "/api/goals",
      user: memberA,
    });

    const result = (await handler(event)) as { goals: unknown[] };
    expect(result.goals).toHaveLength(1);
  });
});
