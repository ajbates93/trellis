import { db, withWorkspace } from "#server/database/connection";
import { notifications, users } from "#server/database/schema";
import { eq } from "drizzle-orm";

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
  /**
   * The recipient's workspace. Looked up from the user when omitted; callers
   * that already hold the recipient row (e.g. the reminder tasks) can pass it
   * to skip the lookup.
   */
  workspaceId?: string | null;
}

/**
 * Insert a notification row for a recipient. Fire-and-forget:
 * logs errors but never throws so callers can call without try/catch.
 *
 * A notification belongs to its recipient's workspace, so the insert is bound
 * to that workspace (via `withWorkspace`) and stamps `workspace_id` explicitly.
 * That makes it satisfy row-level security regardless of the calling context -
 * request handlers, scheduled tasks, and detached timers (the debounced
 * published-feedback flush) all reach this helper, and only some of those carry
 * a request workspace scope.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    // Resolve the recipient's workspace when the caller did not supply it.
    // `users` is not under RLS, so this read works in any scope.
    let workspaceId = input.workspaceId ?? null;
    if (workspaceId == null) {
      const [recipient] = await db
        .select({ workspaceId: users.workspaceId })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      workspaceId = recipient?.workspaceId ?? null;
    }

    await withWorkspace({ workspaceId }, async () => {
      await db.insert(notifications).values({
        userId: input.userId,
        workspaceId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link,
        metadata: input.metadata ?? {},
        createdAt: new Date(),
      });
    });
  } catch (error) {
    console.error("[createNotification] failed:", error);
  }
}
