import { db } from "../../database/connection";
import { feedback, users, reviewSchedules } from "../../database/schema";
import { eq, and, inArray } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Find all users where current user is their buddy
    const buddyAssignments = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.buddyId, session.user.id));

    if (buddyAssignments.length === 0) {
      return { buddyAssignments: [] };
    }

    // Get IDs of all assigned buddies
    const buddyIds = buddyAssignments.map((u) => u.id);

    // Fetch all unpublished feedback for these users
    const unpublishedFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        revieweeId: feedback.revieweeId,
        reviewScheduleId: feedback.reviewScheduleId,
        reviewer: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
        review: {
          id: reviewSchedules.id,
          name: reviewSchedules.name,
          scheduledDate: reviewSchedules.scheduledDate,
        },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      .leftJoin(reviewSchedules, eq(feedback.reviewScheduleId, reviewSchedules.id))
      .where(
        and(
          inArray(feedback.revieweeId, buddyIds),
          eq(feedback.published, false)
        )
      );

    // Group feedback by reviewee
    const groupedByReviewee = buddyAssignments.map((user) => {
      const userFeedback = unpublishedFeedback.filter(
        (f) => f.revieweeId === user.id
      );

      return {
        user,
        pendingCount: userFeedback.length,
        feedback: userFeedback,
      };
    });

    return { buddyAssignments: groupedByReviewee };
  } catch (error) {
    console.error("Error fetching buddy feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy feedback",
    });
  }
});
