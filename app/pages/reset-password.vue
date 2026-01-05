<template>
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center space-y-3">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
          <UIcon name="i-heroicons-lock-closed" class="text-white text-3xl" />
        </div>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Enter your new password
      </p>
    </div>

    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      :title="error"
    />

    <UAlert
      v-if="success"
      icon="i-heroicons-check-circle"
      color="green"
      variant="soft"
      title="Password Reset Successful!"
      description="Redirecting you to login..."
    />

    <form v-if="!success" @submit.prevent="handleResetPassword" class="space-y-6">
      <UFormGroup
        label="New Password"
        name="password"
        :error="passwordError"
      >
        <UInput
          v-model="password"
          type="password"
          placeholder="Enter new password"
          icon="i-heroicons-lock-closed"
          :disabled="loading"
        />
      </UFormGroup>

      <UFormGroup
        label="Confirm Password"
        name="confirmPassword"
        :error="confirmPasswordError"
      >
        <UInput
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          icon="i-heroicons-lock-closed"
          :disabled="loading"
        />
      </UFormGroup>

      <UButton
        type="submit"
        color="primary"
        size="xl"
        block
        :loading="loading"
        :disabled="!password || !confirmPassword"
      >
        Reset Password
      </UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { createAuthClient } from "better-auth/vue";

definePageMeta({
  layout: "auth",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authClient = createAuthClient();

const token = ref(route.query.token as string || "");
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

onMounted(() => {
  if (!token.value) {
    error.value = "Invalid reset link. Please request a new password reset.";
  }
});

const handleResetPassword = async () => {
  if (passwordError.value || confirmPasswordError.value) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await authClient.resetPassword({
      newPassword: password.value,
      token: token.value,
    });

    success.value = true;
    toast.add({
      title: "Success!",
      description: "Your password has been reset. Redirecting to login...",
      color: "green",
      icon: "i-heroicons-check-circle",
    });

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err: any) {
    console.error("Reset password error:", err);
    error.value = err.message || "Failed to reset password. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>
