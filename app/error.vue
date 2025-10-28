<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="text-center max-w-md">
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
        {{ error.message || 'An unexpected error occurred.' }}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <UButton
          size="lg"
          icon="i-heroicons-arrow-left"
          @click="handleError"
        >
          Go Back
        </UButton>
        <UButton
          size="lg"
          color="white"
          icon="i-heroicons-home"
          to="/"
        >
          Go Home
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  error: {
    type: Object,
    required: true,
  },
});

const errorTitle = computed(() => {
  switch (props.error.statusCode) {
    case 403:
      return 'Access Denied';
    case 404:
      return 'Page Not Found';
    case 500:
      return 'Server Error';
    default:
      return 'Something Went Wrong';
  }
});

const errorIcon = computed(() => {
  switch (props.error.statusCode) {
    case 403:
      return 'i-heroicons-shield-exclamation';
    case 404:
      return 'i-heroicons-question-mark-circle';
    case 500:
      return 'i-heroicons-exclamation-triangle';
    default:
      return 'i-heroicons-x-circle';
  }
});

const errorIconClass = computed(() => {
  switch (props.error.statusCode) {
    case 403:
      return 'text-red-500';
    case 404:
      return 'text-yellow-500';
    case 500:
      return 'text-orange-500';
    default:
      return 'text-gray-500';
  }
});

const handleError = () => clearError({ redirect: '/' });
</script>
