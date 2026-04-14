import { db } from "#server/database/connection";
import { onboardingImports, users } from "#server/database/schema";
import { eq, desc } from "drizzle-orm";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";

export default defineEventHandler(async (event) => {
  try {
    // Get all onboarding imports with admin info
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
      .leftJoin(users, eq(onboardingImports.adminId, users.id))
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
