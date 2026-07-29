import { describe, it, expect } from "vitest";
import handler from "./index.post";
import {
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// F2: an admin must not be able to write a check-in onto - and read back the
// details of - a user in another workspace.
describe("POST /api/checkins (integration, cross-tenant - F2)", () => {
  it("denies an admin acting on a user in another workspace", async () => {
    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const adminA = await seedUser({ role: "admin", workspaceId: wsA.id });
    const targetB = await seedUser({ workspaceId: wsB.id });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/checkins",
      body: { userId: targetB.id, notes: "Cross-tenant check-in attempt" },
      user: adminA,
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
  });
});
