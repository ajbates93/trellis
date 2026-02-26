import { db } from "../../database/connection";
import { feedback, users } from "../../database/schema";
import { sql, eq, and, or, gte } from "drizzle-orm";
import { subWeeks } from "date-fns";
import { validateResponse } from "../../utils/validation";
import { getWorkspaceId } from "../../utils/workspace";
import { apiSchemas } from "../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;
  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const userId = session.user.id;
  const workspaceId = getWorkspaceId(event);

  try {
    const twelveWeeksAgo = subWeeks(new Date(), 12);

    // Get all feedback involving the current user in the last 12 weeks
    const recentFeedback = await db
      .select({
        reviewerId: feedback.reviewerId,
        revieweeId: feedback.revieweeId,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(
        and(
          or(
            eq(feedback.reviewerId, userId),
            eq(feedback.revieweeId, userId),
          ),
          gte(feedback.createdAt, twelveWeeksAgo),
        ),
      );

    // Build connection map: counterpart -> { givenCount, receivedCount, lastDate }
    const connectionMap = new Map<
      string,
      { givenCount: number; receivedCount: number; lastDate: Date | null }
    >();

    for (const f of recentFeedback) {
      const isGiver = f.reviewerId === userId;
      const counterpartId = isGiver ? f.revieweeId : f.reviewerId;

      const entry = connectionMap.get(counterpartId) || {
        givenCount: 0,
        receivedCount: 0,
        lastDate: null,
      };

      if (isGiver) {
        entry.givenCount++;
      } else {
        entry.receivedCount++;
      }

      if (f.createdAt && (!entry.lastDate || f.createdAt > entry.lastDate)) {
        entry.lastDate = f.createdAt;
      }

      connectionMap.set(counterpartId, entry);
    }

    // Get all workspace teammates (excluding current user)
    const teammates = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          eq(users.workspaceId, workspaceId),
          eq(users.emailVerified, true),
          sql`${users.id} != ${userId}`,
        ),
      );

    // Build connections and gaps
    const connections: Array<{
      userId: string;
      name: string;
      avatarUrl: string | null;
      givenCount: number;
      receivedCount: number;
      lastExchangeDate: Date | null;
    }> = [];

    const gaps: Array<{
      userId: string;
      name: string;
      avatarUrl: string | null;
    }> = [];

    for (const teammate of teammates) {
      const conn = connectionMap.get(teammate.id);
      if (conn) {
        connections.push({
          userId: teammate.id,
          name: teammate.name,
          avatarUrl: teammate.avatarUrl,
          givenCount: conn.givenCount,
          receivedCount: conn.receivedCount,
          lastExchangeDate: conn.lastDate,
        });
      } else {
        gaps.push({
          userId: teammate.id,
          name: teammate.name,
          avatarUrl: teammate.avatarUrl,
        });
      }
    }

    // Sort connections by total exchanges descending
    connections.sort(
      (a, b) =>
        b.givenCount + b.receivedCount - (a.givenCount + a.receivedCount),
    );

    // Sort gaps alphabetically
    gaps.sort((a, b) => a.name.localeCompare(b.name));

    return validateResponse(
      { connections, gaps },
      apiSchemas.GetFeedbackNetworkResponseSchema,
    );
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error("Error computing feedback network:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to compute feedback network",
    });
  }
});
