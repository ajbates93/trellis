import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    // Fetch users where current user is their buddy
    const myBuddies = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
        preferredName: users.preferredName,
        pronouns: users.pronouns,
        bio: users.bio,
        reviewPreference: users.reviewPreference,
        communicationPreferences: users.communicationPreferences,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.buddyId, user.id));

    return validateResponse(
      { buddies: myBuddies },
      apiSchemas.GetMyBuddiesResponseSchema
    );
  } catch (error) {
    console.error("Error fetching buddies:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddies",
    });
  }
});
