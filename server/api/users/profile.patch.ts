import { db } from "#server/database/connection";
import { users } from "#server/database/schema";
import { eq } from "drizzle-orm";
import { uploadAvatarToS3 } from "#server/utils/s3";
import { validateResponse } from "#server/utils/validation";
import { apiSchemas } from "#server/schemas";
import { requireUser } from "#server/utils/auth-guards";

export default defineEventHandler(async (event) => {
  const user = requireUser(event);

  try {
    const body = await readBody(event);

    // Validate field lengths
    if (body.name && body.name.length > 255) {
      throw createError({
        statusCode: 400,
        message: "Name must be 255 characters or less",
      });
    }

    if (body.preferredName && body.preferredName.length > 100) {
      throw createError({
        statusCode: 400,
        message: "Preferred name must be 100 characters or less",
      });
    }

    if (body.pronouns && body.pronouns.length > 50) {
      throw createError({
        statusCode: 400,
        message: "Pronouns must be 50 characters or less",
      });
    }

    if (body.bio && body.bio.length > 5000) {
      throw createError({
        statusCode: 400,
        message: "Bio must be 5000 characters or less",
      });
    }

    if (
      body.reviewPreference &&
      !["in-person", "remote", "hybrid", "no-preference"].includes(
        body.reviewPreference
      )
    ) {
      throw createError({
        statusCode: 400,
        message:
          "Review preference must be one of: in-person, remote, hybrid, no-preference",
      });
    }

    if (body.communicationPreferences && body.communicationPreferences.length > 5000) {
      throw createError({
        statusCode: 400,
        message: "Communication preferences must be 5000 characters or less",
      });
    }

    // Validate timezone if provided (and not empty string)
    if (body.timezone && body.timezone.trim() !== "") {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
      } catch {
        throw createError({
          statusCode: 400,
          message: "Invalid timezone format",
        });
      }
    }

    // Build update object with only allowed fields
    const updateData: any = {};
    if ("name" in body && body.name) updateData.name = body.name;
    if ("preferredName" in body) updateData.preferredName = body.preferredName || null;
    if ("pronouns" in body) updateData.pronouns = body.pronouns || null;
    if ("bio" in body) updateData.bio = body.bio || null;
    if ("reviewPreference" in body) updateData.reviewPreference = body.reviewPreference || null;
    if ("communicationPreferences" in body)
      updateData.communicationPreferences = body.communicationPreferences || null;
    if ("timezone" in body) updateData.timezone = body.timezone || null;

    // Handle avatar upload to S3
    if ("avatarUrl" in body) {
      if (body.avatarUrl) {
        // Upload to S3 and get the URL
        try {
          console.log("Avatar upload requested");
          const s3Url = await uploadAvatarToS3(body.avatarUrl, user.id);
          console.log("Avatar uploaded successfully, URL:", s3Url);
          updateData.avatarUrl = s3Url;
        } catch (error) {
          console.error("Avatar upload error:", error);
          throw createError({
            statusCode: 500,
            message: "Failed to upload avatar",
          });
        }
      } else {
        // Clear avatar
        console.log("Clearing avatar");
        updateData.avatarUrl = null;
      }
    }

    updateData.updatedAt = new Date();

    // Update user
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        preferredName: users.preferredName,
        pronouns: users.pronouns,
        bio: users.bio,
        reviewPreference: users.reviewPreference,
        communicationPreferences: users.communicationPreferences,
        timezone: users.timezone,
        avatarUrl: users.avatarUrl,
        image: users.image,
        roleType: users.roleType,
        buddyId: users.buddyId,
        nextReviewDate: users.nextReviewDate,
      });

    if (!updatedUser.length) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    console.log("Profile updated successfully");
    return validateResponse(
      { success: true, user: updatedUser[0] },
      apiSchemas.SuccessResponseSchema.passthrough()
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      throw error;
    }
    console.error("Error updating profile:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to update profile",
    });
  }
});
