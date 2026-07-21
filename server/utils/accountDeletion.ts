import { db } from "#server/database/connection";
import {
  users,
  goals,
  goalMilestones,
  goalNotes,
  buddyCheckins,
  achievements,
  notifications,
  feedbackInsights,
  accounts,
  sessions,
} from "#server/database/schema";
import { eq, or, and, inArray } from "drizzle-orm";

/**
 * Throws a 400 if `userId` is an admin and the only admin in `workspaceId`.
 * No-op (resolves) if the user is not an admin, or if another admin exists.
 *
 * Callers (admin delete, self-service delete) must call this BEFORE
 * anonymizeUser to prevent a workspace being left with zero admins.
 */
export async function assertNotSoleAdmin(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (target?.role !== "admin") return;

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.workspaceId, workspaceId), eq(users.role, "admin")));

  if (admins.length <= 1) {
    throw createError({
      statusCode: 400,
      message:
        "You are the only admin in this workspace. Assign another admin before deleting this account.",
    });
  }
}

/**
 * Anonymizes and deactivates a user for GDPR account deletion.
 *
 * Retains `feedback` and `review_schedules` rows (anonymized via the
 * tombstoned user record they still reference) but deletes all other
 * user-owned artifacts. Removes better-auth accounts/sessions so the user
 * is immediately logged out and cannot re-login until re-invited.
 *
 * Wrapped in a single transaction so a failure partway through does not
 * leave the user half-deleted.
 */
export async function anonymizeUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Delete goal children, then goals.
    const userGoals = await tx
      .select({ id: goals.id })
      .from(goals)
      .where(eq(goals.userId, userId));
    const goalIds = userGoals.map((g) => g.id);
    if (goalIds.length) {
      await tx.delete(goalNotes).where(inArray(goalNotes.goalId, goalIds));
      await tx
        .delete(goalMilestones)
        .where(inArray(goalMilestones.goalId, goalIds));
    }
    await tx.delete(goals).where(eq(goals.userId, userId));

    // Delete other owned artifacts.
    await tx
      .delete(buddyCheckins)
      .where(
        or(eq(buddyCheckins.userId, userId), eq(buddyCheckins.buddyId, userId)),
      );
    await tx.delete(achievements).where(eq(achievements.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx
      .delete(feedbackInsights)
      .where(eq(feedbackInsights.userId, userId));

    // Null buddy pointers to this user.
    await tx.update(users).set({ buddyId: null }).where(eq(users.buddyId, userId));

    // Remove auth records (logs them out, blocks re-login until re-invited).
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));

    // Tombstone the user record. feedback and review_schedules are
    // intentionally retained and anonymized via this tombstoned record.
    await tx
      .update(users)
      .set({
        name: "Deleted user",
        email: `deleted-${userId}@deleted.invalid`,
        emailVerified: false,
        avatarUrl: null,
        image: null,
        bio: null,
        pronouns: null,
        preferredName: null,
        communicationPreferences: null,
        buddyId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });
}
