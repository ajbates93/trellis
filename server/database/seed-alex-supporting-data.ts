import "dotenv/config";
import { db, client } from "./connection";
import {
  users,
  achievements,
  goals,
  goalMilestones,
  feedback,
  reviewSchedules,
} from "./schema";
import { eq, and, or } from "drizzle-orm";

const TARGET_EMAIL = "alex.bates@pocketworks.co.uk";

const ACHIEVEMENTS = [
  {
    title: "Won a sale",
    achievedDate: "2026-04-17",
    description:
      "Pretty small budget but I was pleased that I was able to jump on an opportunity from something that a client mentioned in a meeting to scoping out and ultimately getting the sale agreed with mundusi.",
  },
  {
    title: "Took on the PO role for a project",
    achievedDate: "2026-04-11",
    description:
      "I got the chance to work as a PO (even just on a small initial project for mundusi) but it was a nice change of pace from focusing on the dev side of things, I quite liked it and would like to do it again.",
  },
  {
    title: "Shipped Trellis MVP to staging",
    achievedDate: "2026-03-22",
    description:
      "End-to-end flow working: invitation-based auth, dashboard, feedback inbox, Slack /submit command. Reviewed by Matteo before staging promotion.",
  },
  {
    title: "Mentored a junior dev through their first PR",
    achievedDate: "2026-02-14",
    description:
      "Spent a couple of pairing sessions walking through the codebase, then reviewed the PR in detail. Good chance to articulate why we do things a certain way.",
  },
  {
    title: "Spoke at the internal tech talk",
    achievedDate: "2026-01-30",
    description: "Short talk on Better Auth integration patterns. Received great feedback.",
  },
];

const GOALS: {
  goalText: string;
  status: "active" | "completed" | "archived";
  targetDate: string | null;
  milestones: { title: string; isCompleted: boolean }[];
}[] = [
  {
    goalText: "Attend Conferences",
    status: "active",
    targetDate: "2026-12-31",
    milestones: [
      { title: "Identify 3 relevant conferences", isCompleted: true },
      { title: "Submit one CFP", isCompleted: true },
      { title: "Attend first conference of the year", isCompleted: false },
      { title: "Write a recap post afterwards", isCompleted: false },
    ],
  },
  {
    goalText: "Release Trellis MVP",
    status: "completed",
    targetDate: "2026-01-12",
    milestones: [
      { title: "Auth + invitations", isCompleted: true },
      { title: "Dashboard + feedback inbox", isCompleted: true },
      { title: "Slack /submit integration", isCompleted: true },
      { title: "Production deploy", isCompleted: true },
    ],
  },
  {
    goalText: "Release Node (Rolodex)",
    status: "active",
    targetDate: "2026-06-01",
    milestones: [
      { title: "Define MVP scope", isCompleted: true },
      { title: "Build contact import", isCompleted: false },
      { title: "Ship private beta", isCompleted: false },
    ],
  },
  {
    goalText: "Read 3 technical books",
    status: "active",
    targetDate: "2026-12-31",
    milestones: [
      { title: "Book 1: Designing Data-Intensive Applications", isCompleted: true },
      { title: "Book 2", isCompleted: false },
      { title: "Book 3", isCompleted: false },
    ],
  },
  {
    goalText: "Get involved in backend project",
    status: "completed",
    targetDate: null,
    milestones: [],
  },
  {
    goalText: "🚀 Release Trellis v1",
    status: "active",
    targetDate: "2026-12-31",
    milestones: [
      { title: "Multi-tenancy decision locked", isCompleted: false },
      { title: "Pilot with 3 external orgs", isCompleted: false },
      { title: "Public landing page live", isCompleted: false },
    ],
  },
];

const FEEDBACK_AUTHORS: { email: string; content: string; daysAgo: number }[] = [
  {
    email: "mark.houghton@pocketworks.co.uk",
    daysAgo: 80,
    content:
      "Really awesome work on Trellis! I've been slow to get started using it, but I've really enjoyed seeing how it's come together and the feedback flow feels intuitive.",
  },
  {
    email: "matt.chambers@pocketworks.co.uk",
    daysAgo: 31,
    content:
      "Trellis has \"grown\" into something that looks great, has loads of cool features and feels really polished. Excited to keep using it.",
  },
  {
    email: "matteo@pocketworks.co.uk",
    daysAgo: 50,
    content:
      "Pairing on the Slack integration was super useful — really clear thinking about state shape and what to defer. Thanks for walking me through it.",
  },
  {
    email: "marcin@pocketworks.co.uk",
    daysAgo: 14,
    content:
      "Appreciate how you've been keeping reviews on-time even when things are busy. Sets a good tone for the team.",
  },
];

async function run() {
  console.log(`🌱 Seeding supporting data for ${TARGET_EMAIL}\n`);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, TARGET_EMAIL))
    .limit(1);

  if (!user) {
    console.error(`❌ User ${TARGET_EMAIL} not found. Run 'npm run db:seed' first.`);
    process.exit(1);
  }
  console.log(`✓ Found user (id=${user.id})`);

  // Find existing upcoming review for alex to use as the window anchor
  const reviews = await db
    .select()
    .from(reviewSchedules)
    .where(eq(reviewSchedules.userId, user.id));
  if (reviews.length === 0) {
    console.log("⚠️  No reviews found for alex. Skipping feedback (needs a review window).");
  } else {
    console.log(`✓ Found ${reviews.length} review(s); newest will anchor the feedback window.`);
  }

  // Achievements
  console.log(`\n⭐ Achievements`);
  const existingAchievements = await db
    .select({ title: achievements.title })
    .from(achievements)
    .where(eq(achievements.userId, user.id));
  const existingTitles = new Set(existingAchievements.map((a) => a.title));
  for (const a of ACHIEVEMENTS) {
    if (existingTitles.has(a.title)) {
      console.log(`   • skip: ${a.title}`);
      continue;
    }
    await db.insert(achievements).values({
      userId: user.id,
      title: a.title,
      achievedDate: a.achievedDate,
      description: a.description,
    });
    console.log(`   + ${a.title}`);
  }

  // Goals + milestones
  console.log(`\n🎯 Goals + milestones`);
  const existingGoals = await db
    .select({ id: goals.id, goalText: goals.goalText })
    .from(goals)
    .where(eq(goals.userId, user.id));
  const existingGoalTexts = new Map(existingGoals.map((g) => [g.goalText, g.id]));

  for (const goal of GOALS) {
    let goalId = existingGoalTexts.get(goal.goalText) ?? null;
    if (goalId) {
      console.log(`   • skip: ${goal.goalText}`);
    } else {
      const [inserted] = await db
        .insert(goals)
        .values({
          userId: user.id,
          goalText: goal.goalText,
          status: goal.status,
          targetDate: goal.targetDate,
          completedAt: goal.status === "completed" ? new Date() : null,
        })
        .returning({ id: goals.id });
      goalId = inserted!.id;
      console.log(`   + ${goal.goalText} [${goal.status}]`);
    }

    if (goal.milestones.length === 0) continue;
    const existingMs = await db
      .select({ id: goalMilestones.id })
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId));
    if (existingMs.length > 0) continue;

    for (let i = 0; i < goal.milestones.length; i++) {
      const m = goal.milestones[i]!;
      await db.insert(goalMilestones).values({
        goalId,
        title: m.title,
        isCompleted: m.isCompleted,
        completedAt: m.isCompleted ? new Date() : null,
        displayOrder: i,
      });
    }
    console.log(`     ↳ ${goal.milestones.length} milestones`);
  }

  // Feedback — only if alex has a review; we'll backdate within its window so it shows in Supporting Data.
  if (reviews.length > 0) {
    console.log(`\n💬 Feedback`);
    for (const fb of FEEDBACK_AUTHORS) {
      const [author] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.email, fb.email))
        .limit(1);
      if (!author) {
        console.log(`   ⚠️  no user ${fb.email}, skipping`);
        continue;
      }

      // Idempotency: skip if same author->alex with same content already exists.
      const dupe = await db
        .select({ id: feedback.id })
        .from(feedback)
        .where(
          and(
            eq(feedback.reviewerId, author.id),
            eq(feedback.revieweeId, user.id),
            eq(feedback.content, fb.content),
          ),
        )
        .limit(1);
      if (dupe.length > 0) {
        console.log(`   • skip: ${author.name}`);
        continue;
      }

      const createdAt = new Date(Date.now() - fb.daysAgo * 24 * 60 * 60 * 1000);
      const isoWeek = (d: Date) => {
        const target = new Date(d.valueOf());
        const day = (target.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - day + 3);
        const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
        const week =
          1 +
          Math.round(
            ((target.getTime() - firstThursday.getTime()) / 86400000 -
              3 +
              ((firstThursday.getUTCDay() + 6) % 7)) /
              7,
          );
        return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
      };

      await db.insert(feedback).values({
        reviewerId: author.id,
        revieweeId: user.id,
        content: fb.content,
        weekYear: isoWeek(createdAt),
        createdAt,
        published: true,
        publishedAt: createdAt,
        publishedBy: author.id,
        isRead: true,
      });
      console.log(`   + ${author.name} (${fb.daysAgo}d ago)`);
    }
  }

  console.log(`\n✅ Done.`);
  await client.end();
}

void or; // keep imported helper for future use
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
