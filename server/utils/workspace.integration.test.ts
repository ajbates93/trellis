import { describe, it, expect } from "vitest";
import { assertSameWorkspace } from "./workspace";
import {
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// assertSameWorkspace is the tenant-isolation primitive every admin-acting-on-
// a-userId handler is supposed to call. The mocked unit suite never exercises
// it against real rows (the mock DB ignores the where predicate), so a broken
// isolation check would pass there. This runs it against the real users table.
describe("assertSameWorkspace (integration, real query layer)", () => {
  it("throws 403 for a target user in a different workspace", async () => {
    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const caller = await seedUser({ workspaceId: wsA.id });
    const target = await seedUser({ workspaceId: wsB.id });

    const event = createIntegrationEvent({ user: caller });

    await expect(assertSameWorkspace(event, target.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("resolves for a target user in the same workspace", async () => {
    const wsA = await seedWorkspace();
    const caller = await seedUser({ workspaceId: wsA.id });
    const target = await seedUser({ workspaceId: wsA.id });

    const event = createIntegrationEvent({ user: caller });

    await expect(assertSameWorkspace(event, target.id)).resolves.toBeUndefined();
  });

  it("throws 403 when the target user does not exist", async () => {
    const wsA = await seedWorkspace();
    const caller = await seedUser({ workspaceId: wsA.id });

    const event = createIntegrationEvent({ user: caller });

    await expect(
      assertSameWorkspace(event, "nonexistent-user-id"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
