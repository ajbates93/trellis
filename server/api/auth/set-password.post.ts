import { db } from "#server/database/connection";
import { users, verifications, accounts } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { hashPassword } from "#server/utils/password";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email, password, token } = body;

    if (!email || !password || !token) {
      throw createError({
        statusCode: 400,
        message: "Email, password, and token are required",
      });
    }

    // Validate password length (Better Auth defaults)
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

    // Verify token
    const [verification] = await db
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.identifier, email),
          eq(verifications.value, token),
        ),
      )
      .limit(1);

    if (!verification) {
      throw createError({
        statusCode: 400,
        message: "Invalid or expired invitation link",
      });
    }

    // Check if token is expired
    if (new Date() > verification.expiresAt) {
      await db.delete(verifications).where(eq(verifications.id, verification.id));
      throw createError({
        statusCode: 400,
        message: "Invitation link has expired. Please contact your admin for a new invitation.",
      });
    }

    // Find pre-created user
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.emailVerified, false), // Must be pre-created
        ),
      )
      .limit(1);

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found or already activated",
      });
    }

    // Hash password using the same function Better Auth uses (from server/utils/password.ts)
    const hashedPassword = await hashPassword(password);

    // Create credential account for the existing user
    const now = new Date();
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: user.id, // Link to existing pre-created user
      accountId: email, // Account identifier (email for credential provider)
      providerId: "credential", // Better Auth's email/password provider ID
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    // Update user: mark as activated
    await db
      .update(users)
      .set({
        emailVerified: true,
        passwordEnabled: true,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    // Delete verification token
    await db.delete(verifications).where(eq(verifications.id, verification.id));

    console.log(`✅ Password set successfully for ${email}`);

    return {
      success: true,
      message: "Password set successfully",
    };
  } catch (error: any) {
    console.error("Set password error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to set password",
    });
  }
});
