import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import handler from "./reorder.patch";
import { goalMilestones } from "#server/database/schema";
import {
  db,
  seedWorkspace,
  seedUser,
  seedGoal,
  seedGoalMilestone,
  createIntegrationEvent,
} from "#server/__tests__/integration/helpers/harness";

// F17: the milestone reorder must be bound to the owned goal. A user who owns
// one goal must not be able to rewrite the ordering of a milestone that belongs
// to a different goal by placing its id in the request body.
describe("PATCH /api/goals/[id]/milestones/reorder (integration - F17)", () => {
  it("rejects a milestone id that belongs to another goal and leaves it unchanged", async () => {
    const ws = await seedWorkspace();
    const userA = await seedUser({ workspaceId: ws.id });
    const userB = await seedUser({ workspaceId: ws.id });
    const goalA = await seedGoal(userA.id);
    const milestoneA = await seedGoalMilestone(goalA.id, { displayOrder: 1 });
    const goalB = await seedGoal(userB.id);

    // userB owns goalB, but tries to reorder userA's milestone via goalB.
    const event = createIntegrationEvent({
      method: "PATCH",
      path: `/api/goals/${goalB.id}/milestones/reorder`,
      params: { id: goalB.id },
      body: { milestones: [{ id: milestoneA.id, displayOrder: 99 }] },
      user: userB,
    });

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 });

    const [after] = await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.id, milestoneA.id));
    expect(after?.displayOrder).toBe(1); // untouched
  });

  it("reorders a milestone on the caller's own goal", async () => {
    const ws = await seedWorkspace();
    const user = await seedUser({ workspaceId: ws.id });
    const goal = await seedGoal(user.id);
    const milestone = await seedGoalMilestone(goal.id, { displayOrder: 1 });

    const event = createIntegrationEvent({
      method: "PATCH",
      path: `/api/goals/${goal.id}/milestones/reorder`,
      params: { id: goal.id },
      body: { milestones: [{ id: milestone.id, displayOrder: 5 }] },
      user,
    });

    const result = (await handler(event)) as { success: boolean };
    expect(result.success).toBe(true);

    const [after] = await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.id, milestone.id));
    expect(after?.displayOrder).toBe(5);
  });
});
