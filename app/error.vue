<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="text-center max-w-md">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <TrellisLogo :size="56" />
      </div>

      <!-- Error Icon -->
      <div class="mb-6">
        <UIcon
          :name="errorIcon"
          :class="errorIconClass"
          class="mx-auto text-8xl mb-4"
        />
      </div>

      <!-- Error Code -->
      <h1 class="text-6xl font-bold text-gray-900 dark:text-white mb-2">
        {{ error.statusCode }}
      </h1>

      <!-- Error Title -->
      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
        {{ errorTitle }}
      </h2>

      <!-- Error Message -->
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        {{ errorMessage }}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <UButton
          size="lg"
          icon="i-heroicons-home"
          color="primary"
          @click="handleBackToDashboard"
        >
          Back to dashboard
        </UButton>
        <UButton
          size="lg"
          icon="i-heroicons-arrow-right-on-rectangle"
          variant="outline"
          to="/login"
        >
          Log in
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import * as Sentry from "@sentry/nuxt";

const props = defineProps<{
  error: NuxtError;
}>();

const errorTitle = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "Page not found";
    case 403:
      return "You do not have access";
    default:
      return "Something went wrong";
  }
});

const errorMessage = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "The page you're looking for doesn't exist or may have been moved.";
    case 403:
      return "You don't have permission to view this page. Contact your admin if you think this is a mistake.";
    default:
      return props.error.message || "An unexpected error occurred. Our team has been notified.";
  }
});

const errorIcon = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "i-heroicons-question-mark-circle";
    case 403:
      return "i-heroicons-shield-exclamation";
    default:
      return "i-heroicons-exclamation-triangle";
  }
});

const errorIconClass = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return "text-yellow-500";
    case 403:
      return "text-red-500";
    default:
      return "text-orange-500";
  }
});

const handleBackToDashboard = () => clearError({ redirect: "/dashboard" });

onMounted(() => {
  if (import.meta.client) {
    Sentry.captureException(props.error);
  }
});
</script>
