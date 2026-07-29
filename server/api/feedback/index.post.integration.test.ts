import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import handler from "./index.post";
import { feedback } from "#server/database/schema";
import {
  db,
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// F3: a user in one workspace must not be able to write feedback addressed to a
// user in another. The mocked unit suite stubs assertSameWorkspace, so this is
// the test that actually exercises the boundary against real rows.
describe("POST /api/feedback (integration, cross-tenant - F3)", () => {
  it("denies feedback addressed to a user in another workspace", async () => {
    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const reviewer = await seedUser({ workspaceId: wsA.id });
    const revieweeB = await seedUser({ workspaceId: wsB.id });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/feedback",
      body: {
        revieweeId: revieweeB.id,
        content: "Cross-tenant feedback attempt",
      },
      user: reviewer,
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });

    const rows = await db
      .select()
      .from(feedback)
      .where(eq(feedback.revieweeId, revieweeB.id));
    expect(rows).toHaveLength(0);
  });

  it("allows feedback within the same workspace", async () => {
    const ws = await seedWorkspace();
    const reviewer = await seedUser({ workspaceId: ws.id });
    const reviewee = await seedUser({ workspaceId: ws.id });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/feedback",
      body: { revieweeId: reviewee.id, content: "Nice work this week!" },
      user: reviewer,
    });

    const result = (await handler(event)) as { success: boolean };
    expect(result.success).toBe(true);
  });
});
