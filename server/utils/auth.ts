import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "#server/database/connection";
import * as schema from "#server/database/schema";
import { eq, and } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { sendEmail, emailTemplates } from "./email";
import { hashPassword, verifyPassword } from './password'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  session: {
      expiresIn: 60 * 60 * 24 * 30, // (30 days)
      updateAge: 60 * 60 * 24 * 7, // Refresh if older than 7 days
  },
  emailAndPassword: {
    enabled: true,
    password: {
        hash: hashPassword,
        verify: verifyPassword,
    },
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // We handle this via invitation flow
    sendResetPassword: async ({ user, url }) => {
      console.log(`📧 Sending password reset email to ${user.email}`);

      // Don't await to prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Reset Your Trellis Password",
        html: emailTemplates.passwordReset(user.name, url),
      }).catch((error) => {
        console.error("Failed to send password reset email:", error);
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"], // Auto-link verified Google accounts
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      roleType: {
        type: "string",
        required: false,
      },
      buddyId: {
        type: "string",
        required: false,
      },
      nextReviewDate: {
        type: "date",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      preferredName: {
        type: "string",
        required: false,
      },
      pronouns: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      reviewPreference: {
        type: "string",
        required: false,
      },
      communicationPreferences: {
        type: "string",
        required: false,
      },
      timezone: {
        type: "string",
        required: false,
      },
      onboardingTasks: {
        type: "string[]",
        required: false,
      },
      workspaceId: {
        type: "string",
        required: false,
      },
      isSuperAdmin: {
        type: "boolean",
        required: false,
      },
      passwordEnabled: {
        type: "boolean",
        required: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email;

          if (!email) {
            throw new APIError("BAD_REQUEST", {
              message: "Email is required for authentication",
            });
          }

          // Check if a pre-created user exists with this email
          const existingSeededUsers = await db
            .select()
            .from(schema.users)
            .where(
              and(
                eq(schema.users.email, email),
                eq(schema.users.emailVerified, false), // Pre-created users have emailVerified = false
              ),
            );

          // If no pre-created user found, reject the creation
          if (existingSeededUsers.length === 0) {
            console.log(`🚫 Unauthorized login attempt: ${email} (not invited)`);
            throw new APIError("FORBIDDEN", {
              message: "You haven't been invited to this workspace. Contact your admin for access.",
            });
          }

          console.log(`✅ Invitation found for ${email} - allowing user creation`);

          // Allow user creation to proceed
          return { data: user };
        },
      },
    },
  },
  hooks: {
    user: {
      created: async ({ user }) => {
        const email = user.email;
        if (!email) return;

        // Check if a pre-created user exists with this email
        const existingSeededUsers = await db
          .select()
          .from(schema.users)
          .where(
            and(
              eq(schema.users.email, email),
              eq(schema.users.emailVerified, false), // Pre-created users have emailVerified = false
            ),
          );

        // If we found a pre-created user (not the one just created by Better Auth)
        const seededUser = existingSeededUsers.find((u) => u.id !== user.id);

        if (!seededUser) {
          // This shouldn't happen if databaseHooks.before is working, but log it
          console.warn(`⚠️ No pre-created user found for ${email} in created hook (should have been blocked by before hook)`);
          return;
        }

        // Pre-created user found - proceed with linking
        try {
          console.log(
            `🔗 Linking pre-created user ${seededUser.name} (${seededUser.id}) with OAuth user (${user.id})`,
          );

          // Update all feedback references to point to the new Better Auth user ID
          await db
            .update(schema.feedback)
            .set({ reviewerId: user.id })
            .where(eq(schema.feedback.reviewerId, seededUser.id));

          await db
            .update(schema.feedback)
            .set({ revieweeId: user.id })
            .where(eq(schema.feedback.revieweeId, seededUser.id));

          // Update all goals references
          await db
            .update(schema.goals)
            .set({ userId: user.id })
            .where(eq(schema.goals.userId, seededUser.id));

          // Update all review schedules references
          await db
            .update(schema.reviewSchedules)
            .set({ userId: user.id })
            .where(eq(schema.reviewSchedules.userId, seededUser.id));

          await db
            .update(schema.reviewSchedules)
            .set({ buddyId: user.id })
            .where(eq(schema.reviewSchedules.buddyId, seededUser.id));

          // Update buddy relationships - people who have this user as their buddy
          await db
            .update(schema.users)
            .set({ buddyId: user.id })
            .where(eq(schema.users.buddyId, seededUser.id));

          // Transfer the buddy relationship and other fields from seeded user to OAuth user
          const updateData: any = {};
          if (seededUser.buddyId) {
            updateData.buddyId = seededUser.buddyId;
          }
          if (seededUser.roleType) {
            updateData.roleType = seededUser.roleType;
          }
          if (seededUser.nextReviewDate) {
            updateData.nextReviewDate = seededUser.nextReviewDate;
          }
          if (seededUser.role) {
            updateData.role = seededUser.role;
          }
          // Transfer workspace assignment
          if (seededUser.workspaceId) {
            updateData.workspaceId = seededUser.workspaceId;
          }
          // Transfer super admin status (in case admin was pre-created)
          if (seededUser.isSuperAdmin) {
            updateData.isSuperAdmin = seededUser.isSuperAdmin;
          }
          // Transfer timezone preference
          if (seededUser.timezone) {
            updateData.timezone = seededUser.timezone;
          }

          if (Object.keys(updateData).length > 0) {
            await db
              .update(schema.users)
              .set(updateData)
              .where(eq(schema.users.id, user.id));
          }

          // Delete the old pre-created user record
          await db
            .delete(schema.users)
            .where(eq(schema.users.id, seededUser.id));

          console.log(
            `✅ Successfully merged pre-created user ${seededUser.name} into OAuth user`,
          );
        } catch (error) {
          console.error("Error linking pre-created user:", error);
          // Don't throw - allow user creation to continue even if linking fails
        }
      },
    },
  },
});
