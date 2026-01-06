import { auth } from "../../utils/auth";
import { db } from "../../database/connection";
import { accounts } from "../../database/schema";
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
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to fetch accounts",
    });
  }
});
