import { db } from "../../database/connection";
import { users } from "../../database/schema";
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
    // Fetch all users, selecting only necessary fields
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        avatarUrl: users.avatarUrl,
        roleType: users.roleType,
      })
      .from(users);

    return validateResponse(
      { users: allUsers },
      apiSchemas.GetAllUsersResponseSchema
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch users",
    });
  }
});
