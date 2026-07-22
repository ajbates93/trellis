import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { validateBody, validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";
import { sendUserInvitation } from "#server/utils/invitations";

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

  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: "Failed to create user",
    });
  }

  // Email the invitation immediately for single manual adds.
  try {
    await sendUserInvitation({ id: newUser.id, name: newUser.name, email: newUser.email });
  } catch (err) {
    console.error("Failed to send invitation on manual add:", err);
  }

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
