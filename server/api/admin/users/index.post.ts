import { db } from "../../../database/connection";
import { users } from "../../../database/schema";
import { eq } from "drizzle-orm";

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

  const body = await readBody(event);
  const { name, email, roleType, buddyId } = body;

  // Validation
  if (!name || !email) {
    throw createError({
      statusCode: 400,
      message: "Name and email are required",
    });
  }

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw createError({
      statusCode: 409,
      message: "User with this email already exists",
    });
  }

  // Create new user (pre-created, so emailVerified = false)
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      role: "user", // Default to user role
      roleType: roleType || null,
      buddyId: buddyId || null,
      emailVerified: false, // Mark as invited/pre-created
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return {
    success: true,
    user: newUser,
  };
});
