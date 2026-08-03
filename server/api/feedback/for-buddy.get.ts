import { db } from "#server/database/connection";
import { feedback, users } from "#server/database/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const query = getQuery(event);
    const buddyIdFilter = query.buddyId as string | undefined;

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
      .where(eq(users.buddyId, user.id));

    if (buddyAssignments.length === 0) {
      return { buddyAssignments: [] };
    }

    // If filtering by buddyId, verify it's one of the assigned buddies
    if (buddyIdFilter) {
      const isBuddy = buddyAssignments.some((u) => u.id === buddyIdFilter);
      if (!isBuddy) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view this buddy's feedback",
        });
      }
    }

    // Get IDs of all assigned buddies (or just the filtered one)
    const buddyIds = buddyIdFilter
      ? [buddyIdFilter]
      : buddyAssignments.map((u) => u.id);

    // Fetch all unpublished feedback for these users
    const unpublishedFeedback = await db
      .select({
        id: feedback.id,
        content: feedback.content,
        createdAt: feedback.createdAt,
        revieweeId: feedback.revieweeId,
        // reviewScheduleId: feedback.reviewScheduleId,
        reviewer: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
        },
        // review: {
        //   id: reviewSchedules.id,
        //   name: reviewSchedules.name,
        //   scheduledDate: reviewSchedules.scheduledDate,
        // },
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.reviewerId, users.id))
      // .leftJoin(reviewSchedules, eq(feedback.reviewScheduleId, reviewSchedules.id))
      .where(
        and(
          inArray(feedback.revieweeId, buddyIds),
          eq(feedback.published, false)
        )
      )
      .orderBy(desc(feedback.createdAt));

    // Group feedback by reviewee (or return single buddy's feedback if filtered)
    const filteredBuddyAssignments = buddyIdFilter
      ? buddyAssignments.filter((u) => u.id === buddyIdFilter)
      : buddyAssignments;

    const groupedByReviewee = filteredBuddyAssignments.map((user) => {
      const userFeedback = unpublishedFeedback.filter(
        (f) => f.revieweeId === user.id
      );

      return {
        user,
        pendingCount: userFeedback.length,
        feedback: userFeedback,
      };
    });

    return validateResponse(
      { buddyAssignments: groupedByReviewee },
      apiSchemas.GetForBuddyResponseSchema
    );
  } catch (error) {
    console.error("Error fetching buddy feedback:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy feedback",
    });
  }
});
