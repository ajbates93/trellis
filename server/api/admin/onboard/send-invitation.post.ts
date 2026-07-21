import { db } from "#server/database/connection";
import { users, verifications } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "#server/utils/auth";
import { sendEmail, emailTemplates } from "#server/utils/email";

export default defineEventHandler(async (event) => {
  try {
    // Verify admin session
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Check if user is admin (workspace admin or super admin)
    const sessionUser = session.user as typeof session.user & {
      role?: string | null;
      isSuperAdmin?: boolean | null;
    };
    const isAdmin = sessionUser.role === "admin" || sessionUser.isSuperAdmin === true;
    if (!isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Admin access required",
      });
    }

    // Get request body
    const body = await readBody(event);
    const { userId } = body;

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: "userId is required",
      });
    }

    // Find the pre-created user
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
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

    // Generate verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token in Better Auth's verification table
    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: user.email,
      value: token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Build set password URL
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const setPasswordUrl = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Send invitation email
    await sendEmail({
      to: user.email,
      subject: "Welcome to Trellis - Set Your Password",
      html: emailTemplates.invitation(user.name, setPasswordUrl),
    });

    console.log(`📧 Invitation email sent to ${user.email}`);

    return {
      success: true,
      message: `Invitation sent to ${user.email}`,
    };
  } catch (error: any) {
    console.error("Send invitation error:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to send invitation",
    });
  }
});
