import { db } from "../../database/connection";
import { users } from "../../database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized - Please log in",
    });
  }

  try {
    // Fetch users where current user is their buddy
    const myBuddies = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users)
      .where(eq(users.buddyId, session.user.id));

    return { users: myBuddies };
  } catch (error) {
    console.error("Error fetching buddies:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch buddies",
    });
  }
});
