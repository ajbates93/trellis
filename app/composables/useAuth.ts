import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields, adminClient } from "better-auth/client/plugins";

export const useAuth = () => {
  const authClient = createAuthClient({
    plugins: [
      inferAdditionalFields({
        user: {
          roleType: {
            type: "string",
          },
          buddyId: {
            type: "string",
          },
          nextReviewDate: {
            type: "date",
          },
          avatarUrl: {
            type: "string",
          },
          preferredName: {
            type: "string",
          },
          pronouns: {
            type: "string",
          },
          bio: {
            type: "string",
          },
          reviewPreference: {
            type: "string",
          },
          communicationPreferences: {
            type: "string",
          },
        },
      }),
      adminClient(),
    ],
  });
  const sessionData = authClient.useSession();
  const user = computed(() => sessionData.value.data?.user);
  const session = computed(() => sessionData.value.data?.session);

  const signOut = async () => {
    await authClient.signOut();
    await navigateTo("/login");
  };

  // Method to refresh/refetch the session
  const refreshSession = async () => {
    // Better Auth's useSession returns reactive data that updates automatically
    // But we can trigger a manual fetch by calling the session endpoint
    await authClient.$fetch("/session");
  };

  return {
    authClient,
    user,
    session,
    signOut,
    refreshSession,
  };
};
