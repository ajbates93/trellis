import { db } from "../../database/connection";
import { goals, users, goalMilestones } from "../../database/schema";
import { eq, desc, and, or, asc, inArray } from "drizzle-orm";
import { validateResponse } from "../../utils/validation";
import { apiSchemas } from "../../schemas";

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
    const buddyIdFilter = query.buddyId as string | undefined;

    // Find all users where current user is their buddy
    const allBuddies = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.buddyId, session.user.id));

    // If filtering by buddyId, verify it's one of the assigned buddies
    if (buddyIdFilter) {
      const isBuddy = allBuddies.some((u) => u.id === buddyIdFilter);
      if (!isBuddy) {
        throw createError({
          statusCode: 403,
          message: "You do not have permission to view this buddy's goals",
        });
      }
    }

    // Then get all their goals (active and completed, exclude archived)
    const buddyGoals = await db
      .select({
        goal: {
          id: goals.id,
          userId: goals.userId,
          goalText: goals.goalText,
          description: goals.description,
          status: goals.status,
          targetDate: goals.targetDate,
          createdAt: goals.createdAt,
          updatedAt: goals.updatedAt,
          completedAt: goals.completedAt,
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          avatarUrl: users.avatarUrl,
          preferredName: users.preferredName,
          pronouns: users.pronouns,
          bio: users.bio,
          roleType: users.roleType,
          createdAt: users.createdAt,
        },
      })
      .from(goals)
      .innerJoin(users, eq(goals.userId, users.id))
      .where(
        and(
          buddyIdFilter
            ? eq(users.id, buddyIdFilter)
            : eq(users.buddyId, session.user.id),
          or(eq(goals.status, "active"), eq(goals.status, "completed"))
        )
      )
      .orderBy(desc(goals.createdAt));

    // Fetch milestones for all goals
    const goalIds = buddyGoals.map((g) => g.goal.id);
    const milestones =
      goalIds.length > 0
        ? await db
            .select()
            .from(goalMilestones)
            .where(inArray(goalMilestones.goalId, goalIds))
            .orderBy(asc(goalMilestones.displayOrder), asc(goalMilestones.createdAt))
        : [];

    // Group milestones by goalId
    const milestonesByGoal = milestones.reduce(
      (acc, m) => {
        if (!acc[m.goalId]) acc[m.goalId] = [];
        acc[m.goalId].push(m);
        return acc;
      },
      {} as Record<string, typeof milestones>
    );

    // Group goals by user (with milestones attached)
    const groupedByUser = buddyGoals.reduce(
      (acc, item) => {
        const userId = item.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: item.user,
            goals: [],
          };
        }
        acc[userId].goals.push({
          ...item.goal,
          milestones: milestonesByGoal[item.goal.id] || [],
        });
        return acc;
      },
      {} as Record<
        string,
        {
          user: (typeof buddyGoals)[0]["user"];
          goals: ((typeof buddyGoals)[0]["goal"] & { milestones: typeof milestones })[];
        }
      >
    );

    // Convert to array
    const buddyAssignments = Object.values(groupedByUser);

    return validateResponse(
      { buddyAssignments },
      apiSchemas.GetBuddyGoalsResponseSchema
    );
  } catch (error) {
    console.error("Error fetching buddy goals:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy goals",
    });
  }
});
