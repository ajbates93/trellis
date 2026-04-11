import { db } from "../../database/connection";
import {
  feedback,
  users,
  goals,
  goalMilestones,
  achievements,
  reviewSchedules,
} from "../../database/schema";
import { eq, and, desc, inArray, isNotNull, or } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

const DEFAULT_LIMIT = 10;
const PER_SOURCE_LIMIT = 20;

type Activity = {
  id: string;
  type:
    | "feedback_received"
    | "feedback_given"
    | "goal_milestone"
    | "brag_bucket"
    | "buddy_feedback"
    | "review_completed";
  description: string;
  href: string | null;
  isRead: boolean | null;
  createdAt: string;
};

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const userId = session.user.id;

    // 1. Buddees (users for whom the current user is the assigned buddy)
    const buddees = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.buddyId, userId));

    const buddeeIds = buddees.map((b) => b.id);
    const buddeeNameById = new Map(buddees.map((b) => [b.id, b.name]));

    // 2. Feedback received (published)
    const received = await db
      .select({
        id: feedback.id,
        personName: users.name,
        isRead: feedback.isRead,
        createdAt: feedback.publishedAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(feedback.revieweeId, userId),
          eq(feedback.published, true),
          isNotNull(feedback.publishedAt),
        ),
      )
      .orderBy(desc(feedback.publishedAt))
      .limit(PER_SOURCE_LIMIT);

    // 3. Feedback given
    const given = await db
      .select({
        id: feedback.id,
        personName: users.name,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.revieweeId, users.id))
      .where(
        and(eq(feedback.reviewerId, userId), isNotNull(feedback.createdAt)),
      )
      .orderBy(desc(feedback.createdAt))
      .limit(PER_SOURCE_LIMIT);

    // 4. Goal milestones (completed, for this user's goals)
    const milestones = await db
      .select({
        id: goalMilestones.id,
        title: goalMilestones.title,
        completedAt: goalMilestones.completedAt,
      })
      .from(goalMilestones)
      .innerJoin(goals, eq(goalMilestones.goalId, goals.id))
      .where(
        and(
          eq(goals.userId, userId),
          eq(goalMilestones.isCompleted, true),
          isNotNull(goalMilestones.completedAt),
        ),
      )
      .orderBy(desc(goalMilestones.completedAt))
      .limit(PER_SOURCE_LIMIT);

    // 5. Brag bucket (achievements) for this user
    const userAchievements = await db
      .select({
        id: achievements.id,
        title: achievements.title,
        createdAt: achievements.createdAt,
      })
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          isNotNull(achievements.createdAt),
        ),
      )
      .orderBy(desc(achievements.createdAt))
      .limit(PER_SOURCE_LIMIT);

    // 6. Buddy feedback (feedback received by any of my buddees, published)
    const buddyFeedbackRaw =
      buddeeIds.length > 0
        ? await db
            .select({
              id: feedback.id,
              reviewerName: users.name,
              buddeeId: feedback.revieweeId,
              publishedAt: feedback.publishedAt,
            })
            .from(feedback)
            .innerJoin(users, eq(feedback.reviewerId, users.id))
            .where(
              and(
                inArray(feedback.revieweeId, buddeeIds),
                eq(feedback.published, true),
                isNotNull(feedback.publishedAt),
              ),
            )
            .orderBy(desc(feedback.publishedAt))
            .limit(PER_SOURCE_LIMIT)
        : [];

    // 7. Reviews completed (either side of the relationship)
    const reviews = await db
      .select({
        id: reviewSchedules.id,
        userId: reviewSchedules.userId,
        buddyId: reviewSchedules.buddyId,
        userName: users.name,
        completedDate: reviewSchedules.completedDate,
      })
      .from(reviewSchedules)
      .innerJoin(
        users,
        or(
          and(
            eq(reviewSchedules.userId, userId),
            eq(reviewSchedules.buddyId, users.id),
          ),
          and(
            eq(reviewSchedules.buddyId, userId),
            eq(reviewSchedules.userId, users.id),
          ),
        )!,
      )
      .where(
        and(
          eq(reviewSchedules.status, "completed"),
          isNotNull(reviewSchedules.completedDate),
          or(
            eq(reviewSchedules.userId, userId),
            eq(reviewSchedules.buddyId, userId),
          )!,
        ),
      )
      .orderBy(desc(reviewSchedules.completedDate))
      .limit(PER_SOURCE_LIMIT);

    // Normalise all sources into a single Activity array.
    // Null timestamps are filtered out in the queries above, but Drizzle still
    // types the columns as nullable — defensively drop any stragglers here
    // rather than fall back to `new Date()` (which would rank broken rows
    // as the most recent event and corrupt sort order).
    const activities: Activity[] = [
      ...received
        .filter((r) => r.createdAt != null)
        .map<Activity>((r) => ({
          id: `feedback_received:${r.id}`,
          type: "feedback_received",
          description: `You received feedback from ${r.personName}`,
          href: "/feedback/inbox",
          isRead: r.isRead ?? null,
          createdAt: r.createdAt!.toISOString(),
        })),
      ...given
        .filter((g) => g.createdAt != null)
        .map<Activity>((g) => ({
          id: `feedback_given:${g.id}`,
          type: "feedback_given",
          description: `You submitted feedback for ${g.personName}`,
          href: "/feedback/inbox?tab=given",
          isRead: null,
          createdAt: g.createdAt!.toISOString(),
        })),
      ...milestones
        .filter((m) => m.completedAt != null)
        .map<Activity>((m) => ({
          id: `goal_milestone:${m.id}`,
          type: "goal_milestone",
          description: `Milestone completed: "${m.title}"`,
          href: "/goals",
          isRead: null,
          createdAt: m.completedAt!.toISOString(),
        })),
      ...userAchievements
        .filter((a) => a.createdAt != null)
        .map<Activity>((a) => ({
          id: `brag_bucket:${a.id}`,
          type: "brag_bucket",
          description: `You added to your brag bucket: "${a.title}"`,
          href: "/brag-bucket",
          isRead: null,
          createdAt: a.createdAt!.toISOString(),
        })),
      ...buddyFeedbackRaw
        .filter((b) => b.publishedAt != null)
        .map<Activity>((b) => ({
          id: `buddy_feedback:${b.id}`,
          type: "buddy_feedback",
          description: `${b.reviewerName} submitted feedback for ${buddeeNameById.get(b.buddeeId) ?? "your buddy"}`,
          href: `/buddies/feedback?buddy=${b.buddeeId}`,
          isRead: null,
          createdAt: b.publishedAt!.toISOString(),
        })),
      ...reviews
        .filter((r) => r.completedDate != null)
        .map<Activity>((r) => ({
          id: `review_completed:${r.id}`,
          type: "review_completed",
          description: `Review with ${r.userName} completed`,
          href: "/reviews",
          isRead: null,
          createdAt: new Date(r.completedDate!).toISOString(),
        })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, DEFAULT_LIMIT);

    return validateResponse(
      { activities },
      apiSchemas.GetDashboardActivityResponseSchema,
    );
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard activity",
    });
  }
});
