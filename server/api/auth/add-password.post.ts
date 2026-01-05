import { auth } from "../../utils/auth";
import { db } from "../../database/connection";
import { users, accounts } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import { bytesToHex } from "@noble/hashes/utils.js";

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

    // Hash password using @noble/hashes/scrypt (exact same library as Better Auth)
    // Better Auth implementation from packages/better-auth/src/crypto/password.ts
    const normalizedPassword = password.normalize("NFKC");
    const salt = randomBytes(16);

    // Better Auth scrypt config
    const config = {
      N: 16384,
      r: 16,
      p: 1,
      dkLen: 64,
    };

    const key = scrypt(normalizedPassword, salt, config);
    const hashedPassword = `${bytesToHex(salt)}:${bytesToHex(key)}`;

    // Create credential account
    const now = new Date();
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
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
