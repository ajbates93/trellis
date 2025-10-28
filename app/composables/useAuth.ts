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

  return {
    authClient,
    user,
    session,
    signOut,
  };
};
