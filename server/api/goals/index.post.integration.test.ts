import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import handler from "./index.post";
import { goals } from "#server/database/schema";
import {
  db,
  seedWorkspace,
  seedUser,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// The mocked unit suite stubs validateBody to pass its input straight through,
// so a handler could stop validating and the tests would not notice. Here the
// real Zod schema runs.
describe("POST /api/goals (integration, real validation + writes)", () => {
  it("rejects an invalid body with 400 (goalText below the schema minimum)", async () => {
    const ws = await seedWorkspace();
    const user = await seedUser({ workspaceId: ws.id });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/goals",
      body: { goalText: "too short" }, // < 10 chars, fails CreateGoalRequestSchema
      user,
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("persists a valid goal to the real database", async () => {
    const ws = await seedWorkspace();
    const user = await seedUser({ workspaceId: ws.id });

    const event = createIntegrationEvent({
      method: "POST",
      path: "/api/goals",
      body: { goalText: "Learn the drizzle query layer thoroughly" },
      user,
    });

    const result = (await handler(event)) as {
      success: boolean;
      goal: { id: string };
    };
    expect(result.success).toBe(true);

    const persisted = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, user.id));
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.goalText).toBe(
      "Learn the drizzle query layer thoroughly",
    );
  });
});
