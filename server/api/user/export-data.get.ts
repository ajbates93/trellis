import { db } from "#server/database/connection";
import { users, feedback, goals, reviewSchedules, buddyCheckins, achievements } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);
  const uid = user.id;

  // Explicit profile columns: the export is the user's own data, not internal
  // moderation/access-control state (role, banned, banReason, isSuperAdmin).
  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      preferredName: users.preferredName,
      pronouns: users.pronouns,
      bio: users.bio,
      roleType: users.roleType,
      buddyId: users.buddyId,
      avatarUrl: users.avatarUrl,
      image: users.image,
      reviewPreference: users.reviewPreference,
      communicationPreferences: users.communicationPreferences,
      timezone: users.timezone,
      emailNotificationPreferences: users.emailNotificationPreferences,
      nextReviewDate: users.nextReviewDate,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);
  const feedbackGiven = await db.select().from(feedback).where(eq(feedback.reviewerId, uid));
  // Only published feedback: unpublished drafts are not visible to the
  // reviewee anywhere else in the app (see feedback/received.get.ts), so the
  // export must not leak them either.
  const feedbackReceived = await db
    .select()
    .from(feedback)
    .where(and(eq(feedback.revieweeId, uid), eq(feedback.published, true)));
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
