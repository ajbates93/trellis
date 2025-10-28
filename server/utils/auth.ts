import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../database/connection";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { createAuthMiddleware } from "better-auth/api";

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
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  hooks: {
    user: {
      created: async ({ user }) => {
        const email = user.email;
        if (!email) return;

        try {

        // Check if a seeded user exists with this email
        const existingSeededUsers = await db
          .select()
          .from(schema.users)
          .where(
            and(
              eq(schema.users.email, email),
              eq(schema.users.emailVerified, false) // Seeded users have emailVerified = false
            )
          );

        // If we found a seeded user (not the one just created by Better Auth)
        const seededUser = existingSeededUsers.find((u) => u.id !== user.id);

        if (seededUser) {
          console.log(
            `🔗 Linking seeded user ${seededUser.name} (${seededUser.id}) with OAuth user (${user.id})`
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

          // Transfer the buddy relationship from seeded user to OAuth user
          if (seededUser.buddyId) {
            await db
              .update(schema.users)
              .set({ buddyId: seededUser.buddyId })
              .where(eq(schema.users.id, user.id));
          }

          // Delete the old seeded user record
          await db.delete(schema.users).where(eq(schema.users.id, seededUser.id));

          console.log(
            `✅ Successfully merged seeded user ${seededUser.name} into OAuth user`
          );
        }
        } catch (error) {
          console.error("Error linking seeded user:", error);
          // Don't throw - allow user creation to continue even if linking fails
        }
      },
    },
  },
});
