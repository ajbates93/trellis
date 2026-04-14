import { auth } from "#server/utils/auth";
import { db } from "#server/database/connection";
import { users, accounts } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { hashPassword } from "#server/utils/password";

export default defineEventHandler(async (event) => {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    const body = await readBody(event);
    const { password } = body;

    if (!password) {
      throw createError({
        statusCode: 400,
        message: "Password is required",
      });
    }

    // Validate password length
    if (password.length < 8) {
      throw createError({
        statusCode: 400,
        message: "Password must be at least 8 characters",
      });
    }

    if (password.length > 128) {
      throw createError({
        statusCode: 400,
        message: "Password must be less than 128 characters",
      });
    }

    // Check if user already has password
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "credential"),
        ),
      )
      .limit(1);

    if (existingAccount) {
      throw createError({
        statusCode: 400,
        message: "Password already set. Use change password instead.",
      });
    }

    // Hash password using the same function Better Auth uses (from server/utils/password.ts)
    const hashedPassword = await hashPassword(password);

    // Create credential account
    const now = new Date();
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: session.user.id,
      accountId: session.user.email,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    // Update user passwordEnabled flag
    await db
      .update(users)
      .set({ passwordEnabled: true, updatedAt: now })
      .where(eq(users.id, session.user.id));

    console.log(`✅ Password added for user ${session.user.email}`);

    return {
      success: true,
      message: "Password set successfully",
    };
  } catch (error: any) {
    console.error("Add password error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to set password",
    });
  }
});
