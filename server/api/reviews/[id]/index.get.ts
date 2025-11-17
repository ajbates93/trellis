import { db } from "../../../database/connection";
import { reviewSchedules, users, feedback, goals } from "../../../database/schema";
import { eq, and, sql } from "drizzle-orm";

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

    // Get all feedback assigned to this review
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
          eq(feedback.reviewScheduleId, reviewId),
          eq(feedback.published, true)
        )
      )
      .orderBy(feedback.createdAt);

    // Get active goals for the user during review period
    const userGoals = await db
      .select({
        id: goals.id,
        goalText: goals.goalText,
        status: goals.status,
        targetDate: goals.targetDate,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(eq(goals.userId, review.userId))
      .orderBy(goals.createdAt);

    return {
      review: {
        ...review,
        user,
        buddy,
      },
      feedback: reviewFeedback,
      goals: userGoals,
      feedbackCount: reviewFeedback.length,
    };
  } catch (error) {
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
