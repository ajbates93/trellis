import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import reminderTask from "./review-reminders";
import { reviewSchedules } from "#server/database/schema";
import {
  db,
  seedWorkspace,
  seedUser,
  seedReviewSchedule,
} from "#server/__tests__/integration/helpers/harness";

// F14: the manual trigger passes a workspaceId, and the task must only touch
// that workspace's review schedules. Run under DEMO_MODE so emails are
// suppressed (but still counted, so the reminder flags flip) and no network
// call is made.
describe("review-reminders task workspace scoping (integration - F14)", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
  });
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("only flips the reminder flag for schedules in the scoped workspace", async () => {
    // A review 7 days out in each of two workspaces.
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    in7Days.setHours(12, 0, 0, 0);
    const scheduledDate = in7Days.toISOString();

    const wsA = await seedWorkspace();
    const wsB = await seedWorkspace();
    const userA = await seedUser({ workspaceId: wsA.id });
    const buddyA = await seedUser({ workspaceId: wsA.id });
    const userB = await seedUser({ workspaceId: wsB.id });
    const buddyB = await seedUser({ workspaceId: wsB.id });

    const schedA = await seedReviewSchedule(userA.id, buddyA.id, {
      scheduledDate,
    });
    const schedB = await seedReviewSchedule(userB.id, buddyB.id, {
      scheduledDate,
    });

    // Trigger scoped to workspace A only (TaskEvent shape).
    await reminderTask.run({
      name: "review-reminders",
      payload: { workspaceId: wsA.id },
      context: {},
    });

    const [afterA] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, schedA.id));
    const [afterB] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, schedB.id));

    expect(afterA?.reminderSent7d).toBe(true); // scoped workspace processed
    expect(afterB?.reminderSent7d).toBe(false); // other tenant untouched
  });
});
