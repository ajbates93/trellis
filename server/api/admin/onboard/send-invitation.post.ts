import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";
import { getWorkspaceId } from "#server/utils/workspace";
import { sendUserInvitation } from "#server/utils/invitations";

export default defineEventHandler(async (event) => {
  try {
    // Verify admin session
    const authUser = requireUser(event);

    // Check if user is admin (workspace admin or super admin)
    const isAdmin = authUser.role === "admin" || authUser.isSuperAdmin === true;
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

    // Find the pre-created user, scoped to the caller's workspace. Without the
    // workspace predicate an admin could invite (and, via the response, confirm
    // the email of) any pre-created user in any other tenant (F11).
    const workspaceId = getWorkspaceId(event);
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.emailVerified, false), // Must be pre-created
          eq(users.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found or already activated",
      });
    }

    await sendUserInvitation(user);

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
