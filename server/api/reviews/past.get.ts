import { db } from "../../database/connection";
import { reviewSchedules, users, feedback } from "../../database/schema";
import { eq, and, or, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    const query = getQuery(event);
    const forUserId = query.userId as string | undefined;

    // If fetching for a specific user, verify authorization
    if (forUserId) {
      // Check if requesting user is the buddy of the target user or an admin
      const [targetUser] = await db
        .select({ buddyId: users.buddyId })
        .from(users)
        .where(eq(users.id, forUserId))
        .limit(1);

      if (!targetUser) {
        throw createError({
          statusCode: 404,
          message: "User not found",
        });
      }

      const isOwnReviews = forUserId === session.user.id;
      const isBuddy = targetUser.buddyId === session.user.id;
      const isAdmin = session.user.role === 'admin';

      if (!isOwnReviews && !isBuddy && !isAdmin) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view these reviews",
        });
      }
    }

    // Get completed reviews where:
    // - User is the reviewee OR the buddy (or specific user if forUserId provided)
    // - Status is 'completed'
    const pastReviews = await db
      .select({
        id: reviewSchedules.id,
        userId: reviewSchedules.userId,
        buddyId: reviewSchedules.buddyId,
        scheduledDate: reviewSchedules.scheduledDate,
        completedDate: reviewSchedules.completedDate,
        status: reviewSchedules.status,
        name: reviewSchedules.name,
        notes: reviewSchedules.notes,
        completionNotes: reviewSchedules.completionNotes,
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
          forUserId
            ? eq(reviewSchedules.userId, forUserId)
            : or(
                eq(reviewSchedules.userId, session.user.id),
                eq(reviewSchedules.buddyId, session.user.id)
              ),
          eq(reviewSchedules.status, 'completed')
        )
      )
      .orderBy(sql`${reviewSchedules.completedDate} DESC NULLS LAST`);

    // Get buddy info and feedback count for each review
    const reviewsWithDetails = await Promise.all(
      pastReviews.map(async (review) => {
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

    return { reviews: reviewsWithDetails };
  } catch (error) {
    console.error("Error fetching past reviews:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch past reviews",
    });
  }
});
