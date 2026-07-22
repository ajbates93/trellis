import { auth } from "#server/utils/auth";
import { db } from "#server/database/connection";
import { accounts } from "#server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get current user session
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Fetch all accounts for this user
    const userAccounts = await db
      .select({
        id: accounts.id,
        providerId: accounts.providerId,
        accountId: accounts.accountId,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id));

    return userAccounts;
  } catch (error: any) {
    console.error("Failed to fetch accounts:", error);
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      message: "Failed to fetch accounts",
    });
  }
});
