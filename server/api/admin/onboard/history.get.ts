import { db } from "#server/database/connection";
import { onboardingImports, users } from "#server/database/schema";
import { eq, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { getWorkspaceId } from "#server/utils/workspace";

export default defineEventHandler(async (event) => {
  try {
    const workspaceId = getWorkspaceId(event);

    // Get onboarding imports performed by admins in the caller's workspace
    const imports = await db
      .select({
        id: onboardingImports.id,
        filename: onboardingImports.filename,
        rowsImported: onboardingImports.rowsImported,
        status: onboardingImports.status,
        errorLog: onboardingImports.errorLog,
        createdAt: onboardingImports.createdAt,
        adminName: users.name,
        adminEmail: users.email,
      })
      .from(onboardingImports)
      .innerJoin(users, eq(onboardingImports.adminId, users.id))
      .where(eq(users.workspaceId, workspaceId))
      .orderBy(desc(onboardingImports.createdAt))
      .limit(50); // Last 50 imports

    return validateResponse(
      { imports },
      apiSchemas.GetOnboardingHistoryResponseSchema
    );
  } catch (error) {
    console.error("Error fetching import history:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch import history",
    });
  }
});
