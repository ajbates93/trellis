<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex items-center justify-center vertically-center min-h-[50vh] h-full"
  >
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        {{ title || "Coming Soon" }}
      </h1>
      <p v-if="description" class="text-lg text-gray-600 dark:text-gray-400">
        {{ description }}
      </p>
    </div>
  </div>
</template>
