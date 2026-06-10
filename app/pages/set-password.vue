<template>
  <div class="max-w-md w-full space-y-8 p-8">
    <!-- Logo and Title -->
    <div class="text-center space-y-3">
      <div class="flex justify-center">
        <TrellisLogo :size="64" />
      </div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Set Your Password</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Welcome to Trellis! Create your password to get started.
      </p>
    </div>

    <!-- Error Alert -->
    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="error" variant="soft" :title="error" />

    <!-- Success Message -->
    <UAlert
v-if="success" icon="i-heroicons-check-circle" color="success" variant="soft"
      title="Password set successfully!" description="Redirecting you to login..." />

    <!-- Set Password Form -->
    <form v-if="!success" class="space-y-6" @submit.prevent="handleSetPassword">
      <UInput v-model="email" type="email" disabled icon="i-heroicons-envelope" size="xl" class="w-full" />

      <div>
        <UInput
v-model="password" type="password" placeholder="Enter your password" icon="i-heroicons-lock-closed"
          size="xl" class="w-full" :disabled="loading" />
        <p v-if="passwordError" class="text-xs text-red-500 mt-1">{{ passwordError }}</p>
        <p v-else class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Must be at least 8 characters long
        </p>
      </div>

      <div>
        <UInput
v-model="confirmPassword" type="password" placeholder="Confirm your password"
          icon="i-heroicons-lock-closed" size="xl" class="w-full" :disabled="loading" />
        <p v-if="confirmPasswordError" class="text-xs text-red-500 mt-1">{{ confirmPasswordError }}</p>
      </div>

      <UButton
type="submit" color="primary" size="xl" block :loading="loading"
        :disabled="!password || !confirmPassword">
        Set Password & Continue
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?
        <NuxtLink to="/login" class="text-primary hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

useHead({
  title: "Set Password",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const token = ref(route.query.token as string || "");
const email = ref(route.query.email as string || "");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");
const success = ref(false);

const passwordError = computed(() => {
  if (!password.value) return "";
  if (password.value.length < 8) return "Password must be at least 8 characters";
  return "";
});

const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) return "";
  if (confirmPassword.value !== password.value) return "Passwords do not match";
  return "";
});

// Validate token and email on mount
onMounted(async () => {
  if (!token.value || !email.value) {
    error.value = "Invalid or missing invitation link. Please check your email.";
  }
});

const handleSetPassword = async () => {
  // Validation
  if (passwordError.value || confirmPasswordError.value) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // Call custom API to set password for invited user
    const response = await $api("/auth/set-password", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
        token: token.value,
      },
    });

    success.value = true;
    toast.add({
      title: "Success!",
      description: "Your password has been set. Redirecting to login...",
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err: any) {
    console.error("Set password error:", err);
    error.value = err.data?.message || err.message || "Failed to set password. Please try again.";

    if (error.value.includes("expired") || error.value.includes("invalid")) {
      toast.add({
        title: "Link Expired",
        description: "Your invitation link has expired. Please contact your admin for a new invitation.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    }
  } finally {
    loading.value = false;
  }
};
</script>
