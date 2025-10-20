import { createAuthClient } from "better-auth/vue";

export const useAuth = () => {
  const authClient = createAuthClient();
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
