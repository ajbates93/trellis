import "dotenv/config";
import { db, client } from "./connection";
import {
  users,
  feedback,
  feedbackInsights,
  goals,
  goalNotes,
  goalMilestones,
  reviewSchedules,
  achievements,
  notifications,
  onboardingImports,
  buddyCheckins,
  workspaces,
  accounts,
} from "./schema";
import { isDemoMode } from "../utils/demo";
import { hashPassword } from "../utils/password";

const DEMO_WORKSPACE_ID = "demo-workspace";
const DEMO_COMPANY = "Northwind Studios";

const ROLE_TYPES = ["dev", "design", "qa", "growth", "management"] as const;
const FIRST_NAMES = [
  "Ava", "Ben", "Cara", "Dan", "Ella", "Finn", "Gina", "Hugo", "Iris", "Jack",
  "Kira", "Leo", "Mia", "Noah", "Orla", "Pia", "Quin", "Rhys", "Sara", "Tom",
];

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function truncateAppData(): Promise<void> {
  // Order respects FK constraints (children first).
  await db.delete(goalNotes);
  await db.delete(goalMilestones);
  await db.delete(goals);
  await db.delete(buddyCheckins);
  await db.delete(feedbackInsights);
  await db.delete(feedback);
  await db.delete(reviewSchedules);
  await db.delete(achievements);
  await db.delete(notifications);
  await db.delete(onboardingImports);
  await db.delete(accounts);
  // Note: we intentionally do NOT truncate slack_workspaces. The demo never
  // creates Slack rows (the integration is hidden in demo mode), so there is no
  // FK row to clear before deleting users - and the demo database may not even
  // have the table provisioned, so touching it would error.
  await db.delete(users);
  await db.delete(workspaces);
}

/**
 * Wipes and re-seeds the demo dataset. HARD-REFUSES unless DEMO_MODE is true so
 * it can never run against staging/production.
 */
export async function seedDemo(): Promise<void> {
  if (!isDemoMode()) {
    throw new Error("seedDemo refused: DEMO_MODE is not 'true'");
  }

  const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@northwind.demo";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "demo-trellis-1234";

  await truncateAppData();

  await db.insert(workspaces).values({ id: DEMO_WORKSPACE_ID, name: DEMO_COMPANY });

  const now = new Date();
  const hashed = await hashPassword(adminPassword);

  type SeedUser = { id: string; email: string; name: string; roleType: string };
  const seedUsers: SeedUser[] = FIRST_NAMES.map((first, i) => ({
    id: `demo-user-${i}`,
    email: i === 0 ? adminEmail : `${first.toLowerCase()}@northwind.demo`,
    name: i === 0 ? `${first} (Admin)` : `${first} Carter`,
    roleType: ROLE_TYPES[i % ROLE_TYPES.length]!,
  }));

  for (let i = 0; i < seedUsers.length; i++) {
    const u = seedUsers[i]!;
    const buddy = seedUsers[i % 2 === 0 ? i + 1 : i - 1];
    await db.insert(users).values({
      id: u.id,
      email: u.email,
      name: u.name,
      roleType: u.roleType,
      buddyId: buddy ? buddy.id : null,
      workspaceId: DEMO_WORKSPACE_ID,
      emailVerified: true,
      passwordEnabled: i === 0,
      role: i === 0 ? "admin" : "user",
      isSuperAdmin: i === 0,
      createdAt: now,
      updatedAt: now,
    });
    if (i === 0) {
      await db.insert(accounts).values({
        id: "demo-account-admin",
        userId: u.id,
        accountId: u.id,
        providerId: "credential",
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Feedback across ~12 weeks
  for (let w = 0; w < 12; w++) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - w * 7);
    for (let i = 0; i < seedUsers.length; i++) {
      const reviewer = seedUsers[i]!;
      const reviewee = seedUsers[(i + 3 + w) % seedUsers.length]!;
      if (reviewer.id === reviewee.id) continue;
      await db.insert(feedback).values({
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        content: `Great collaboration this week on the ${reviewee.roleType} work. Clear communication and solid follow-through.`,
        weekYear: isoWeek(weekDate),
        published: w > 1,
        publishedAt: w > 1 ? weekDate : null,
        isRead: w > 2,
        createdAt: weekDate,
      });
    }
  }

  // Goals + milestone + note for first 12 users
  for (let i = 0; i < 12; i++) {
    const u = seedUsers[i]!;
    const [goal] = await db
      .insert(goals)
      .values({
        userId: u.id,
        goalText: `Improve ${u.roleType} skills this quarter`,
        status: i % 4 === 0 ? "completed" : "active",
        targetDate: new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().slice(0, 10),
        createdAt: now,
        updatedAt: now,
        completedAt: i % 4 === 0 ? now : null,
      })
      .returning();
    await db.insert(goalMilestones).values({
      goalId: goal!.id,
      title: "First checkpoint reached",
      isCompleted: true,
      completedAt: now,
      displayOrder: 0,
    });
    await db.insert(goalNotes).values({
      goalId: goal!.id,
      authorId: seedUsers[(i + 1) % seedUsers.length]!.id,
      noteText: "Nice progress so far - keep it up!",
    });
  }

  // Reviews: one completed (past) + one upcoming for first 10 users
  for (let i = 0; i < 10; i++) {
    const u = seedUsers[i]!;
    const buddy = seedUsers[i % 2 === 0 ? i + 1 : i - 1] || seedUsers[0]!;
    const past = new Date(now); past.setMonth(past.getMonth() - 2);
    const upcoming = new Date(now); upcoming.setDate(upcoming.getDate() + 14 + i);
    await db.insert(reviewSchedules).values({
      userId: u.id, buddyId: buddy.id,
      scheduledDate: past.toISOString(), completedDate: past.toISOString(),
      status: "completed", name: "Q1 Review",
    });
    await db.insert(reviewSchedules).values({
      userId: u.id, buddyId: buddy.id,
      scheduledDate: upcoming.toISOString(), status: "scheduled", name: "Q2 Review",
    });
  }

  // Achievements for first 8 users
  for (let i = 0; i < 8; i++) {
    await db.insert(achievements).values({
      userId: seedUsers[i]!.id,
      title: "Shipped a major feature",
      achievedDate: now.toISOString().slice(0, 10),
    });
  }

  console.log(`✅ Demo seeded: ${DEMO_COMPANY} (${seedUsers.length} users)`);
}

// CLI entry: `npm run db:seed-demo`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemo()
    .then(() => client.end())
    .catch((err) => {
      console.error("❌ seedDemo failed:", err);
      return client.end().then(() => process.exit(1));
    });
}
