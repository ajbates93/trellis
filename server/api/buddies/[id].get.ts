import { db } from "../../database/connection";
import { users } from "../../database/schema";
import { eq, and } from "drizzle-orm";
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

  const buddyId = getRouterParam(event, "id");

  if (!buddyId) {
    throw createError({
      statusCode: 400,
      message: "Buddy ID is required",
    });
  }

  try {
    // Fetch the buddy profile, but only if current user is their assigned buddy
    const [buddy] = await db
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
      .where(
        and(
          eq(users.id, buddyId),
          eq(users.buddyId, session.user.id)
        )
      );

    if (!buddy) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to view this buddy's profile",
      });
    }

    return validateResponse(
      { buddy },
      apiSchemas.GetBuddyProfileResponseSchema
    );
  } catch (error: unknown) {
    // Re-throw HTTP errors
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Error fetching buddy profile:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddy profile",
    });
  }
});
