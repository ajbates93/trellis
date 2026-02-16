import { db } from "../../database/connection";
import { users, feedback } from "../../database/schema";
import { eq, and, sql, notInArray } from "drizzle-orm";
import { format } from "date-fns";
import { getWorkspaceId } from "../../utils/workspace";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const query = getQuery(event);
  const excludeIds = query.excludeIds
    ? String(query.excludeIds).split(",").filter(Boolean)
    : [];

  const currentUserId = session.user.id;
  const workspaceId = getWorkspaceId(event);
  const currentWeekYear = format(new Date(), "RRRR-'W'II");

  try {
    // Get all users in workspace except self and excluded
    const excludeList = [currentUserId, ...excludeIds];
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          notInArray(users.id, excludeList)
        )
      );

    if (allUsers.length === 0) {
      return { suggestion: null, exhausted: true };
    }

    // Get current user's feedback history grouped by reviewee
    const feedbackHistory = await db
      .select({
        revieweeId: feedback.revieweeId,
        lastReviewedAt: sql<string>`MAX(${feedback.createdAt})`.as("last_reviewed_at"),
        reviewCount: sql<number>`COUNT(*)::int`.as("review_count"),
        lastWeekYear: sql<string>`MAX(${feedback.weekYear})`.as("last_week_year"),
      })
      .from(feedback)
      .where(eq(feedback.reviewerId, currentUserId))
      .groupBy(feedback.revieweeId);

    const historyMap = new Map(
      feedbackHistory.map((h) => [h.revieweeId, h])
    );

    // Build candidates with review info
    const candidates = allUsers.map((u) => {
      const history = historyMap.get(u.id);
      const reviewedThisWeek = history?.lastWeekYear === currentWeekYear;
      return {
        user: u,
        reviewedThisWeek,
        lastReviewedAt: history?.lastReviewedAt || null,
        reviewCount: history?.reviewCount || 0,
        neverReviewed: !history,
      };
    });

    // Filter out users reviewed this week for suggestion priority
    const notReviewedThisWeek = candidates.filter((c) => !c.reviewedThisWeek);
    const pool = notReviewedThisWeek.length > 0 ? notReviewedThisWeek : candidates;

    // Priority tiers
    const neverReviewed = pool.filter((c) => c.neverReviewed);
    let pick;

    if (neverReviewed.length > 0) {
      // Tier 1: Never reviewed - random pick
      pick = neverReviewed[Math.floor(Math.random() * neverReviewed.length)];
    } else {
      // Tier 2: Reviewed longest ago
      const sorted = [...pool].sort((a, b) => {
        if (!a.lastReviewedAt) return -1;
        if (!b.lastReviewedAt) return 1;
        return new Date(a.lastReviewedAt).getTime() - new Date(b.lastReviewedAt).getTime();
      });
      pick = sorted[0];
    }

    // Build reason text
    let reason: string;
    if (pick.neverReviewed) {
      reason = `You've never given feedback to ${pick.user.name}`;
    } else {
      const lastDate = new Date(pick.lastReviewedAt!);
      const weeksAgo = Math.round(
        (Date.now() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      if (weeksAgo <= 1) {
        reason = `It's been about a week since you gave feedback to ${pick.user.name}`;
      } else {
        reason = `It's been ${weeksAgo} weeks since you gave feedback to ${pick.user.name}`;
      }
    }

    // Build review status map for all users (not just the suggestion pick)
    // This includes all workspace users except self, regardless of excludeIds
    const allWorkspaceUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          notInArray(users.id, [currentUserId])
        )
      );

    const reviewStatus: Record<string, { lastReviewedAt: string | null; reviewCount: number; reviewedThisWeek: boolean }> = {};
    for (const u of allWorkspaceUsers) {
      const history = historyMap.get(u.id);
      reviewStatus[u.id] = {
        lastReviewedAt: history?.lastReviewedAt || null,
        reviewCount: history?.reviewCount || 0,
        reviewedThisWeek: history?.lastWeekYear === currentWeekYear,
      };
    }

    return {
      suggestion: {
        user: pick.user,
        reason,
        lastReviewedAt: pick.lastReviewedAt,
        reviewCount: pick.reviewCount,
        reviewedThisWeek: pick.reviewedThisWeek,
      },
      reviewStatus,
      exhausted: false,
    };
  } catch (error) {
    console.error("Failed to get suggestion:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to get suggestion",
    });
  }
});
