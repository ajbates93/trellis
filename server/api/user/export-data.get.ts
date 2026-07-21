import { db } from "#server/database/connection";
import { users, feedback, goals, reviewSchedules, buddyCheckins, achievements } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const uid = session.user.id;

  const [profile] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  const feedbackGiven = await db.select().from(feedback).where(eq(feedback.reviewerId, uid));
  const feedbackReceived = await db.select().from(feedback).where(eq(feedback.revieweeId, uid));
  const userGoals = await db.select().from(goals).where(eq(goals.userId, uid));
  const reviews = await db.select().from(reviewSchedules).where(eq(reviewSchedules.userId, uid));
  const checkins = await db.select().from(buddyCheckins).where(eq(buddyCheckins.userId, uid));
  const userAchievements = await db.select().from(achievements).where(eq(achievements.userId, uid));

  setHeader(event, "Content-Type", "application/json");
  setHeader(event, "Content-Disposition", `attachment; filename="trellis-export-${uid}.json"`);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    feedbackGiven,
    feedbackReceived,
    goals: userGoals,
    reviews,
    checkins,
    achievements: userAchievements,
  };
});
