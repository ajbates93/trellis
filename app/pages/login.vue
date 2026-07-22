<template>
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center space-y-3">
      <!-- Logo -->
      <div class="flex justify-center">
        <TrellisLogo :size="64" />
      </div>

      <!-- Title -->
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Trellis</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Peer feedback made simple
      </p>
    </div>

    <div class="space-y-6">
      <!-- Email/Password Sign In Form -->
      <form class="space-y-4" @submit.prevent="signInWithEmailPassword">
        <UInput
v-model="emailForm.email" type="email" placeholder="your@email.com" icon="i-heroicons-envelope"
          size="xl" class="w-full" :disabled="loading" />

        <UInput
v-model="emailForm.password" type="password" placeholder="Enter your password"
          icon="i-heroicons-lock-closed" size="xl" class="w-full" :disabled="loading" />

        <div class="flex items-center justify-between">
          <UCheckbox v-model="emailForm.rememberMe" label="Remember me" />
          <NuxtLink to="/forgot-password" class="text-sm text-primary hover:underline">
            Forgot password?
          </NuxtLink>
        </div>

        <UButton type="submit" color="primary" size="xl" block :loading="loading">
          Sign in
        </UButton>
      </form>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300 dark:border-gray-700"/>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">Or continue with</span>
        </div>
      </div>

      <!-- Google OAuth Button -->
      <UButton color="primary" size="xl" block :loading="loading" variant="outline" @click="signInWithGoogle">
        <template #leading>
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path
fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path
fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path
fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path
fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </template>
        Sign in with Google
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        By Pocketworks
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields, adminClient } from "better-auth/client/plugins";

definePageMeta({
  layout: "auth",
});

useHead({
  title: "Login",
});

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
        passwordEnabled: {
          type: "boolean",
        },
      },
    }),
    adminClient(),
  ],
});

const loading = ref(false);
const toast = useToast();

// Email/Password form
const emailForm = ref({
  email: "",
  password: "",
  rememberMe: false,
});

const route = useRoute();
const router = useRouter();

// Where to send the user after login. Only allow internal paths (a single
// leading slash) to avoid open-redirect; default to the dashboard.
const returnTo = computed(() => {
  const raw = route.query.returnTo;
  const target = typeof raw === "string" ? raw : "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
});

// Check for error in URL query params (from OAuth callback)
onMounted(() => {
  const error = route.query.error as string;
  if (error) {
    if (error.includes("invited") || error.includes("invitation") || error.includes("workspace")) {
      toast.add({
        title: "Access Denied",
        description: "You haven't been invited to this workspace. Please contact your admin for access.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    } else {
      toast.add({
        title: "Authentication Failed",
        description: error,
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    }
    // Clear error from URL
    router.replace({ query: {} });
  }
});

// Email/Password Sign In
const signInWithEmailPassword = async () => {
  loading.value = true;

  try {
    const result = await authClient.signIn.email({
      email: emailForm.value.email,
      password: emailForm.value.password,
      rememberMe: emailForm.value.rememberMe,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign in failed");
    }

    // Success - redirect to the intended page (or dashboard)
    await navigateTo(returnTo.value);
  } catch (error: any) {
    console.error("Email sign in failed:", error);

    const errorMsg = error?.message || error?.toString() || "Unknown error";

    if (errorMsg.includes("invited") || errorMsg.includes("invitation")) {
      toast.add({
        title: "Access Denied",
        description: "You haven't been invited to this workspace. Please contact your admin.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    } else if (errorMsg.includes("credentials") || errorMsg.includes("password") || errorMsg.includes("Invalid")) {
      toast.add({
        title: "Sign In Failed",
        description: "Invalid email or password. Please try again.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    } else {
      toast.add({
        title: "Authentication Failed",
        description: errorMsg,
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    }

    loading.value = false;
  }
};

const signInWithGoogle = async () => {
  loading.value = true;

  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: returnTo.value,
    });
  } catch (error: any) {
    console.error("Failed to sign in:", error);

    // Display user-friendly error message
    const errorMsg = error?.message || error?.toString() || "Unknown error";

    if (errorMsg.includes("invited") || errorMsg.includes("invitation") || errorMsg.includes("workspace")) {
      toast.add({
        title: "Access Denied",
        description: "You haven't been invited to this workspace. Please contact your admin for access.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    } else {
      toast.add({
        title: "Authentication Failed",
        description: errorMsg,
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    }

    loading.value = false;
  }
};
</script>
