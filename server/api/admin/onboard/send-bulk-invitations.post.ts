import { db } from "../../../database/connection";
import { users, verifications } from "../../../database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "../../../utils/auth";
import { sendEmail, emailTemplates } from "../../../utils/email";

export default defineEventHandler(async (event) => {
  try {
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    const isAdmin = session.user.role === "admin" || session.user.isSuperAdmin === true;
    if (!isAdmin) {
      throw createError({ statusCode: 403, message: "Admin access required" });
    }

    const body = await readBody(event);
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw createError({ statusCode: 400, message: "userIds array is required" });
    }

    // Find pre-created users
    const preCreatedUsers = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          eq(users.emailVerified, false),
        ),
      );

    if (preCreatedUsers.length === 0) {
      throw createError({ statusCode: 404, message: "No pre-created users found" });
    }

    const results = {
      sent: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    // Send invitations
    for (const user of preCreatedUsers) {
      try {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.insert(verifications).values({
          id: crypto.randomUUID(),
          identifier: user.email,
          value: token,
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
        const setPasswordUrl = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

        await sendEmail({
          to: user.email,
          subject: "Welcome to Trellis - Set Your Password",
          html: emailTemplates.invitation(user.name, setPasswordUrl),
        });

        results.sent.push(user.email);
        console.log(`📧 Invitation sent to ${user.email}`);
      } catch (error: any) {
        results.failed.push({
          email: user.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`Failed to send invitation to ${user.email}:`, error);
      }
    }

    return {
      success: results.failed.length === 0,
      sent: results.sent.length,
      failed: results.failed.length,
      details: results,
    };
  } catch (error: any) {
    console.error("Bulk send invitation error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to send invitations",
    });
  }
});
