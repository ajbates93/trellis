import { z } from "zod";
import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "#server/utils/auth-guards";

const UpdateTimezoneSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
});

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = requireUser(event);

    // Parse and validate request body
    const body = await readBody(event);
    const { timezone } = UpdateTimezoneSchema.parse(body);

    // Validate timezone string (basic check)
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw createError({
        statusCode: 400,
        message: "Invalid timezone format",
      });
    }

    // Update user's timezone
    const [updatedUser] = await db
      .update(users)
      .set({
        timezone,
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    return {
      success: true,
      timezone: updatedUser.timezone,
    };
  } catch (error: unknown) {
    console.error("Error updating timezone:", error);
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Failed to update timezone",
    });
  }
});
