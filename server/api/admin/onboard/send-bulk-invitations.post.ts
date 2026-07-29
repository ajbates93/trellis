import { db } from "#server/database/connection";
import { users, verifications } from "#server/database/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";
import { getWorkspaceId } from "#server/utils/workspace";
import { sendEmail, emailTemplates } from "#server/utils/email";

// Bound the batch so a single request cannot enumerate or spam an unbounded
// number of users (F11).
const MAX_BULK_INVITES = 200;

export default defineEventHandler(async (event) => {
  try {
    const user = requireUser(event);

    const isAdmin = user.role === "admin" || user.isSuperAdmin === true;
    if (!isAdmin) {
      throw createError({ statusCode: 403, message: "Admin access required" });
    }

    const body = await readBody(event);
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw createError({ statusCode: 400, message: "userIds array is required" });
    }

    if (userIds.length > MAX_BULK_INVITES) {
      throw createError({
        statusCode: 400,
        message: `Too many userIds: at most ${MAX_BULK_INVITES} per request`,
      });
    }

    // Find pre-created users, scoped to the caller's workspace. Without the
    // workspace predicate this enumerated pre-created users platform-wide and
    // echoed their email addresses back to the caller (F11).
    const workspaceId = getWorkspaceId(event);
    const preCreatedUsers = await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          eq(users.emailVerified, false),
          eq(users.workspaceId, workspaceId),
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

    // Return counts only. Echoing the matched email addresses back (the old
    // `details: results`) was a cross-tenant disclosure vector (F11); the caller
    // does not need resolved addresses to know the outcome.
    return {
      success: results.failed.length === 0,
      sent: results.sent.length,
      failed: results.failed.length,
    };
  } catch (error: any) {
    console.error("Bulk send invitation error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to send invitations",
    });
  }
});
