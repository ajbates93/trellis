import { db } from "#server/database/connection";
import { notifications } from "#server/database/schema";

export type NotificationType =
  | "feedback_received"
  | "buddy_feedback_received"
  | "review_created"
  | "review_rescheduled"
  | "review_cancelled"
  | "review_completed"
  | "review_reminder"
  | "goal_approaching"
  | "goal_overdue";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row for a recipient. Fire-and-forget:
 * logs errors but never throws so callers can call without try/catch.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("[createNotification] failed:", error);
  }
}
