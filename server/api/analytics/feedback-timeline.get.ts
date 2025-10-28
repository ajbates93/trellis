import { db } from "../../database/connection";
import { feedback } from "../../database/schema";
import { eq, and, gte, or } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Calculate date range for last 12 weeks
    const now = new Date();
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - (12 * 7));
    twelveWeeksAgo.setHours(0, 0, 0, 0);

    // Fetch all feedback for the user from the last 12 weeks
    const allFeedback = await db
      .select({
        createdAt: feedback.createdAt,
        reviewerId: feedback.reviewerId,
        revieweeId: feedback.revieweeId,
        published: feedback.published,
      })
      .from(feedback)
      .where(
        and(
          or(
            eq(feedback.reviewerId, session.user.id),
            and(
              eq(feedback.revieweeId, session.user.id),
              eq(feedback.published, true) // Only count published feedback received
            )
          ),
          gte(feedback.createdAt, twelveWeeksAgo)
        )
      );

    // Helper to get start of week for a date
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      return d;
    };

    // Generate all weeks in the range
    const weeks: Date[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - (i * 7));
      weeks.push(getWeekStart(weekDate));
    }

    // Group feedback by week
    const weeklyData = weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const feedbackInWeek = allFeedback.filter(fb => {
        const fbDate = new Date(fb.createdAt);
        return fbDate >= weekStart && fbDate < weekEnd;
      });

      const given = feedbackInWeek.filter(
        fb => fb.reviewerId === session.user.id
      ).length;

      const received = feedbackInWeek.filter(
        fb => fb.revieweeId === session.user.id && fb.published
      ).length;

      return {
        date: weekStart,
        given,
        received,
      };
    });

    return {
      timeline: weeklyData,
    };
  } catch (error) {
    console.error("Error fetching feedback timeline:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch feedback timeline",
    });
  }
});
