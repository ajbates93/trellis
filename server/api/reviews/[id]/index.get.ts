import { db } from "../../../database/connection";
import { reviewSchedules, users, feedback, goals } from "../../../database/schema";
import { eq, and, sql, lte, gte, desc, inArray, ne } from "drizzle-orm";
import { validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  const reviewId = getRouterParam(event, "id");

  if (!reviewId) {
    throw createError({
      statusCode: 400,
      message: "Review ID is required",
    });
  }

  try {
    // Get the review
    const [review] = await db
      .select()
      .from(reviewSchedules)
      .where(eq(reviewSchedules.id, reviewId))
      .limit(1);

    if (!review) {
      throw createError({
        statusCode: 404,
        message: "Review not found",
      });
    }

    // AUTHORIZATION CHECK: Only reviewee, their buddy, or admins can access
    const isReviewee = review.userId === session.user.id;
    const isBuddy = review.buddyId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isReviewee && !isBuddy && !isAdmin) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to view this review",
      });
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.id, review.userId))
      .limit(1);

    // Get buddy info
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

    // Get previous review's completion date to determine start range for feedback
    const previousReviews = await db
      .select()
      .from(reviewSchedules)
      .where(
        and(
          eq(reviewSchedules.userId, review.userId),
          lte(reviewSchedules.scheduledDate, review.scheduledDate)
        )
      )
      .orderBy(desc(reviewSchedules.scheduledDate));

    // Find the previous review for this user
    let startDate = new Date(0); // Beginning of time
    if (previousReviews.length > 1) {
      const previousReview = previousReviews[1];
      if (previousReview) {
        startDate = new Date(previousReview.scheduledDate);
      }
    }

    // Get all feedback received in this period
    const reviewFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        publishedAt: feedback.publishedAt,
        isRead: feedback.isRead,
        reviewer: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .where(
        and(
          eq(feedback.revieweeId, review.userId),
          eq(feedback.published, true),
          gte(feedback.createdAt, startDate),
          lte(feedback.createdAt, new Date(review.scheduledDate))
        )
      )
      .orderBy(feedback.createdAt);

    // Get active and completed goals (exclude archived)
    const userGoals = await db
      .select({
        id: goals.id,
        goalText: goals.goalText,
        status: goals.status,
        targetDate: goals.targetDate,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(
        and(
          eq(goals.userId, review.userId),
          ne(goals.status, "archived")
        )
      )
      .orderBy(goals.createdAt);

    const response = {
      review: {
        ...review,
        user,
        buddy,
      },
      feedback: reviewFeedback,
      goals: userGoals,
      feedbackCount: reviewFeedback.length,
    };

    return validateResponse(response, apiSchemas.GetReviewDetailsResponseSchema);
  } catch (error: any) {
    console.error("Error fetching review:", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to fetch review",
    });
  }
});
