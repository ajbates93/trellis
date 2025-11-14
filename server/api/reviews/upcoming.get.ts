import { db } from "../../database/connection";
import { reviewSchedules, users } from "../../database/schema";
import { eq, and, or, gte, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get upcoming reviews where:
    // - User is the reviewee OR the buddy
    // - Status is 'scheduled'
    // - Scheduled date is today or in the future
    const upcomingReviews = await db
      .select({
        id: reviewSchedules.id,
        userId: reviewSchedules.userId,
        buddyId: reviewSchedules.buddyId,
        scheduledDate: reviewSchedules.scheduledDate,
        status: reviewSchedules.status,
        name: reviewSchedules.name,
        notes: reviewSchedules.notes,
        createdAt: reviewSchedules.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          roleType: users.roleType,
        },
      })
      .from(reviewSchedules)
      .innerJoin(users, eq(reviewSchedules.userId, users.id))
      .where(
        and(
          or(
            eq(reviewSchedules.userId, session.user.id),
            eq(reviewSchedules.buddyId, session.user.id)
          ),
          eq(reviewSchedules.status, 'scheduled'),
          gte(reviewSchedules.scheduledDate, today)
        )
      )
      .orderBy(reviewSchedules.scheduledDate);

    // Get buddy info for each review
    const reviewsWithBuddy = await Promise.all(
      upcomingReviews.map(async (review) => {
        const [buddy] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            roleType: users.roleType,
          })
          .from(users)
          .where(eq(users.id, review.buddyId))
          .limit(1);

        // Count feedback assigned to this review
        const feedbackCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(feedback)
          .where(eq(feedback.reviewScheduleId, review.id))
          .then(result => Number(result[0].count));

        return {
          ...review,
          buddy,
          feedbackCount,
        };
      })
    );

    return { reviews: reviewsWithBuddy };
  } catch (error) {
    console.error("Error fetching upcoming reviews:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch upcoming reviews",
    });
  }
});

// Import feedback table for count query
import { feedback } from "../../database/schema";
