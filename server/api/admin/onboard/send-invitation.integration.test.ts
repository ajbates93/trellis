import { describe, it, expect } from "vitest";
import handler from "./send-invitation.post";
import {
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// F11: the invitation lookup must be scoped to the caller's workspace. A
// workspace-A admin must not be able to invite (or, via the response, confirm
// the existence/email of) a pre-created user in another workspace. Denial
// happens before any email is sent, so this is safe to run without a mail key.
describe("POST /api/admin/onboard/send-invitation (integration - F11)", () => {
  it("does not find a pre-created user in another workspace", async () => {
    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const adminA = await seedUser({ role: "admin", workspaceId: wsA.id });
    const preCreatedB = await seedUser({
      workspaceId: wsB.id,
      emailVerified: false,
    });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/admin/onboard/send-invitation",
      body: { userId: preCreatedB.id },
      user: adminA,
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });
});
