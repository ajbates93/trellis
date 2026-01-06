<template>
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center space-y-3">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
          <UIcon name="i-heroicons-lock-closed" class="text-white text-3xl" />
        </div>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Enter your email and we'll send you a reset link
      </p>
    </div>

    <UAlert
      v-if="success"
      icon="i-heroicons-check-circle"
      color="green"
      variant="soft"
      title="Email Sent!"
      description="Check your inbox for password reset instructions."
    />

    <form v-if="!success" @submit.prevent="handleForgotPassword" class="space-y-6">
      <UInput
        v-model="email"
        type="email"
        placeholder="your@email.com"
        icon="i-heroicons-envelope"
        size="xl"
        class="w-full"
        :disabled="loading"
      />

      <UButton
        type="submit"
        color="primary"
        size="xl"
        block
        :loading="loading"
        :disabled="!email"
      >
        Send Reset Link
      </UButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        Remember your password?
        <NuxtLink to="/login" class="text-primary hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { createAuthClient } from "better-auth/vue";

definePageMeta({
  layout: "auth",
});

const authClient = createAuthClient();
const toast = useToast();

const email = ref("");
const loading = ref(false);
const success = ref(false);

const handleForgotPassword = async () => {
  loading.value = true;

  try {
    await authClient.forgetPassword({
      email: email.value,
      redirectTo: "/reset-password",
    });

    success.value = true;
    toast.add({
      title: "Email Sent",
      description: "Check your inbox for password reset instructions.",
      color: "green",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    toast.add({
      title: "Error",
      description: error.message || "Failed to send reset email. Please try again.",
      color: "red",
      icon: "i-heroicons-exclamation-triangle",
    });
  } finally {
    loading.value = false;
  }
};
</script>
