import { db } from "../../../database/connection";
import { users } from "../../../database/schema";
import { eq } from "drizzle-orm";
import { validateBody, validateResponse } from "../../../utils/validation";
import { apiSchemas } from "../../../schemas";
import { getWorkspaceId } from "../../../utils/workspace";

export default defineEventHandler(async (event) => {
  const session = event.context.session;

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Forbidden - Admin access required",
    });
  }

  // Get workspace ID from current admin
  const workspaceId = getWorkspaceId(event);

  // Validate request body
  const body = await validateBody(event, apiSchemas.CreateUserRequestSchema);

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw createError({
      statusCode: 409,
      message: "User with this email already exists",
    });
  }

  // Create new user (pre-created, so emailVerified = false)
  // Assign to the same workspace as the admin creating them
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email,
      role: "user", // Default to user role
      roleType: body.roleType || null,
      buddyId: body.buddyId || null, // Use buddyId from request
      emailVerified: false, // Mark as invited/pre-created
      workspaceId, // Assign to admin's workspace
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const response = {
    success: true,
    user: {
      ...newUser,
      buddyName: null,
      status: "invited" as const,
    },
  };
  return validateResponse(response, apiSchemas.CreateUserResponseSchema);
});
