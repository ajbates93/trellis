import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import type { NotificationType } from "./inAppNotifications";

export type EmailCategory = Extract<
  NotificationType,
  | "feedback_received"
  | "buddy_feedback_received"
  | "review_created"
  | "review_rescheduled"
  | "review_cancelled"
  | "review_completed"
  | "review_reminder"
>;

/**
 * Returns true if the given user wants email for a given category.
 * Default-on: missing key in preferences = enabled.
 * Returns false only when the user has explicitly opted out, or the user does not exist.
 */
export async function shouldEmail(
  userId: string,
  category: EmailCategory,
): Promise<boolean> {
  const [row] = await db
    .select({ emailNotificationPreferences: users.emailNotificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return false;
  const prefs = row.emailNotificationPreferences ?? {};
  return prefs[category] !== false;
}
