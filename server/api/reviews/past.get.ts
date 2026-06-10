import { db } from "#server/database/connection";
import { reviewSchedules, users, feedback, buddyCheckins } from "#server/database/schema";
import { eq, and, or, sql, lt, gte } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

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

    const today = new Date().toISOString().split('T')[0];

    // Get past reviews where:
    // - User is the reviewee (or specific user if forUserId provided for buddy access)
    // - Status is 'completed'
    // Note: Overdue reviews that are still 'scheduled' appear in Upcoming, not here
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
        reflectionLearnings: reviewSchedules.reflectionLearnings,
        reflectionHighlights: reviewSchedules.reflectionHighlights,
        reflectionConcerns: reviewSchedules.reflectionConcerns,
        templateSnapshot: reviewSchedules.templateSnapshot,
        answers: reviewSchedules.answers,
        selfScore: reviewSchedules.selfScore,
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
            : eq(reviewSchedules.userId, session.user.id),
          eq(reviewSchedules.status, 'completed')
        )
      )
      .orderBy(sql`${reviewSchedules.completedDate} DESC`);

    // Get buddy info, feedback count, and check-ins for each review
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

        // Find the previous review date to establish the start of the feedback period
        const [previousReview] = await db
          .select({ scheduledDate: reviewSchedules.scheduledDate })
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, review.userId),
              lt(reviewSchedules.scheduledDate, review.scheduledDate)
            )
          )
          .orderBy(sql`${reviewSchedules.scheduledDate} DESC`)
          .limit(1);

        const startDate = previousReview ? new Date(previousReview.scheduledDate) : new Date(0); // Epoch if no previous review
        const endDate = new Date(review.scheduledDate); // Count up to this review's scheduled date

        // Count feedback received between previous review and this review
        const feedbackCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(feedback)
          .where(
            and(
              eq(feedback.revieweeId, review.userId),
              gte(feedback.createdAt, startDate),
              lt(feedback.createdAt, endDate)
            )
          )
          .then((result) => Number(result[0]?.count ?? 0));

        // Get check-ins for this review
        const checkinsForReview = await db
          .select({
            id: buddyCheckins.id,
            buddy: {
              id: users.id,
              name: users.name,
              email: users.email,
              avatarUrl: users.avatarUrl,
            },
            notes: buddyCheckins.notes,
            createdAt: buddyCheckins.createdAt,
          })
          .from(buddyCheckins)
          .innerJoin(users, eq(buddyCheckins.buddyId, users.id))
          .where(eq(buddyCheckins.reviewScheduleId, review.id))
          .orderBy(buddyCheckins.createdAt);

        return {
          ...review,
          buddy,
          feedbackCount,
          checkins: checkinsForReview,
        };
      })
    );

    return validateResponse(
      { reviews: reviewsWithDetails },
      apiSchemas.GetReviewsWithDetailsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching past reviews:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch past reviews",
    });
  }
});
