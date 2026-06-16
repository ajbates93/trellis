import { db } from "#server/database/connection";
import { goals, notifications } from "#server/database/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { createNotification } from "#server/utils/inAppNotifications";

export default defineTask({
  meta: {
    name: "goal-reminders",
    description: "Emit goal_approaching and goal_overdue notifications",
  },
  async run() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysOut = new Date(today);
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const sevenStr = sevenDaysOut.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      // 1. Approaching: target_date = today + 7
      const approaching = await db
        .select({
          id: goals.id,
          userId: goals.userId,
          goalText: goals.goalText,
          targetDate: goals.targetDate,
        })
        .from(goals)
        .where(and(eq(goals.status, "active"), eq(goals.targetDate, sevenStr)));

      for (const g of approaching) {
        await createNotification({
          userId: g.userId,
          type: "goal_approaching",
          title: "Goal target date in 7 days",
          body: g.goalText,
          link: "/goals",
          metadata: { goalId: g.id },
        });
      }

      // 2. Overdue: target_date < today, suppress duplicates per goal
      const overdueGoals = await db
        .select({
          id: goals.id,
          userId: goals.userId,
          goalText: goals.goalText,
          targetDate: goals.targetDate,
        })
        .from(goals)
        .where(and(eq(goals.status, "active"), lt(goals.targetDate, todayStr)));

      // Look up which of the currently-overdue goals already have an overdue
      // notification (scoped to the goalIds we're about to process).
      const overdueGoalIds = overdueGoals.map((g) => g.id);
      const existingOverdue = overdueGoalIds.length
        ? await db
            .select({ goalId: sql<string>`metadata->>'goalId'` })
            .from(notifications)
            .where(
              and(
                eq(notifications.type, "goal_overdue"),
                inArray(sql`metadata->>'goalId'`, overdueGoalIds),
              ),
            )
        : [];

      const seen = new Set(existingOverdue.map((r) => r.goalId));

      let overdueEmitted = 0;
      for (const g of overdueGoals) {
        if (seen.has(g.id)) continue;
        await createNotification({
          userId: g.userId,
          type: "goal_overdue",
          title: "Goal is overdue",
          body: g.goalText,
          link: "/goals",
          metadata: { goalId: g.id },
        });
        overdueEmitted++;
      }

      return {
        result: `Emitted ${approaching.length} approaching + ${overdueEmitted} overdue`,
      };
    } catch (error) {
      console.error("[goal-reminders] Task failed:", error);
      return { result: `Task failed: ${error}` };
    }
  },
});
