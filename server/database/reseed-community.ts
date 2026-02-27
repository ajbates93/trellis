import "dotenv/config";
import { db, client } from "./connection";
import { users, feedback } from "./schema";
import { eq, sql } from "drizzle-orm";

/**
 * Reseed script: sets all users to emailVerified=true and populates
 * realistic feedback data across 12 weeks for community insights testing.
 */

const getWeekYear = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

const feedbackContent = [
  "Great job communicating complex technical concepts in team meetings. Very clear and easy to understand.",
  "Really appreciate the regular updates on project progress. Helps everyone stay aligned.",
  "Excellent at actively listening and incorporating feedback from others.",
  "The documentation you wrote was exceptionally clear and helpful.",
  "Really good at explaining technical decisions to non-technical team members.",
  "Could improve on sharing blockers earlier - would help the team provide support sooner.",
  "Would benefit from more frequent check-ins during complex tasks to keep everyone informed.",
  "Your code quality has been consistently excellent. Clean, well-tested, and maintainable.",
  "Great problem-solving skills when debugging that tricky production issue last week.",
  "The refactoring work you did really improved the codebase architecture.",
  "Really impressed with how quickly you picked up the new framework.",
  "Could benefit from more comprehensive error handling in edge cases.",
  "Test coverage has been slipping lately. Would be good to prioritize writing tests alongside features.",
  "Always willing to help teammates when they're stuck. Great team player!",
  "Your code reviews are thorough and educational. I learn something new each time.",
  "Excellent at pairing with junior developers and helping them level up.",
  "Really appreciate how you share knowledge and resources with the team.",
  "Creates a positive and supportive atmosphere in team meetings.",
  "Would love to see you participate more actively in team discussions and brainstorming.",
  "Love that you proactively identified and fixed that performance bottleneck.",
  "Great initiative in proposing and implementing the automated testing improvements.",
  "Your attention to detail in QA has prevented several bugs from reaching production.",
  "The test coverage you maintain is excellent and gives everyone confidence.",
  "Really appreciate the thoroughness of your code reviews.",
  "Consistently delivers work on time and manages commitments well.",
  "Great at breaking down complex tasks and estimating time accurately.",
  "Your understanding of system architecture is really strong and valuable to the team.",
  "Takes ownership of problems and drives them to completion without needing oversight.",
  "Consider being more concise in written communication - key points sometimes get lost.",
  "Would benefit from actively seeking input from others rather than working in isolation.",
  "Excellent at managing client expectations and keeping them informed.",
  "Great at building consensus when the team has different opinions.",
  "Your presentation to stakeholders was outstanding - clear, confident, and well-structured.",
  "Sometimes team updates get a bit too detailed. Focus on high-level summaries first would be helpful.",
  "Never cuts corners - always delivers polished, production-ready work.",
  "Several deadlines have been missed recently. Consider more realistic time estimates.",
  "Consistently spots opportunities for improvement and follows through on them.",
  "Your proactive approach to learning new technologies is inspiring.",
  "Really reliable with deadlines - the team can always count on you.",
  "Balance between speed and quality needs attention - some recent features were rushed.",
];

async function reseed() {
  console.log("🌱 Community reseed starting...\n");

  // Step 1: Set all users to emailVerified = true
  console.log("✅ Setting all users to emailVerified = true...");
  const updatedUsers = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.emailVerified, false))
    .returning({ id: users.id, name: users.name });
  console.log(`   Updated ${updatedUsers.length} users\n`);

  // Step 2: Get all workspace users
  const allUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.emailVerified, true));

  console.log(`👥 Found ${allUsers.length} active users\n`);

  if (allUsers.length < 2) {
    console.log("❌ Need at least 2 users to generate feedback");
    await client.end();
    return;
  }

  // Step 3: Delete existing feedback
  console.log("🗑️  Clearing existing feedback...");
  const deleted = await db.delete(feedback).returning({ id: feedback.id });
  console.log(`   Deleted ${deleted.length} existing feedback entries\n`);

  // Step 4: Generate realistic feedback across 12 weeks
  console.log("💬 Generating feedback across 12 weeks...");

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;
  const allUserIds = allUsers.map((u) => u.id);
  const feedbackRows: any[] = [];

  // Per-user activity profiles: some are very active, some moderate, some sparse
  // This creates realistic leaderboard variation
  const activityProfiles: Record<string, { weeksActive: number[]; feedbackPerWeek: number }> = {};

  for (let i = 0; i < allUserIds.length; i++) {
    const userId = allUserIds[i]!;
    if (i < 3) {
      // Top 3: active almost every week, 2-3 feedback each
      activityProfiles[userId] = {
        weeksActive: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        feedbackPerWeek: 2 + Math.floor(Math.random() * 2),
      };
    } else if (i < 7) {
      // Middle tier: active 6-9 weeks, 1-2 feedback each
      const weeks = Array.from({ length: 12 }, (_, w) => w)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6 + Math.floor(Math.random() * 4));
      activityProfiles[userId] = {
        weeksActive: weeks.sort((a, b) => a - b),
        feedbackPerWeek: 1 + Math.floor(Math.random() * 2),
      };
    } else {
      // Lower tier: active 2-4 weeks, 1 feedback each
      const weeks = Array.from({ length: 12 }, (_, w) => w)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 3));
      activityProfiles[userId] = {
        weeksActive: weeks.sort((a, b) => a - b),
        feedbackPerWeek: 1,
      };
    }
  }

  for (const [userId, profile] of Object.entries(activityProfiles)) {
    for (const weekOffset of profile.weeksActive) {
      const count = profile.feedbackPerWeek;
      const usedRecipients = new Set<string>();

      for (let j = 0; j < count; j++) {
        // Pick a different recipient each time
        let revieweeId = pick(allUserIds.filter((id) => id !== userId && !usedRecipients.has(id)));
        if (!revieweeId) continue;
        usedRecipients.add(revieweeId);

        const weekStart = now - (11 - weekOffset) * oneWeek;
        const dayOffset = Math.floor(Math.random() * 7);
        const hourOffset = Math.floor(Math.random() * 10) + 8; // 8am-6pm
        const createdAt = new Date(weekStart + dayOffset * oneDay + hourOffset * 60 * 60 * 1000);
        const weekYear = getWeekYear(createdAt);

        const isPublished = Math.random() < 0.75;
        const publishedAt = isPublished
          ? new Date(createdAt.getTime() + (1 + Math.random() * 2) * oneDay)
          : null;
        const publishedBy = isPublished
          ? pick(allUserIds.filter((id) => id !== userId))
          : null;
        const isRead = isPublished ? Math.random() < 0.7 : false;

        feedbackRows.push({
          reviewerId: userId,
          revieweeId,
          content: pick(feedbackContent),
          createdAt,
          weekYear,
          published: isPublished,
          publishedAt,
          publishedBy,
          isRead,
        });
      }
    }
  }

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < feedbackRows.length; i += batchSize) {
    const batch = feedbackRows.slice(i, i + batchSize);
    await db.insert(feedback).values(batch);
  }

  console.log(`   Created ${feedbackRows.length} feedback entries\n`);

  // Summary
  const uniqueReviewers = new Set(feedbackRows.map((f) => f.reviewerId));
  console.log(`📊 Summary:`);
  console.log(`   ${allUsers.length} users (all emailVerified)`);
  console.log(`   ${feedbackRows.length} feedback entries across 12 weeks`);
  console.log(`   ${uniqueReviewers.size} unique contributors`);
  console.log(`\n✅ Done!`);

  await client.end();
}

reseed().catch((err) => {
  console.error("❌ Reseed failed:", err);
  process.exit(1);
});
