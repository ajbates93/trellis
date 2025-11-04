<template>
  <UCard>
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
          {{ title }}
        </p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ value }}
        </p>
        <p v-if="subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="icon"
        class="flex h-12 w-12 items-center justify-center rounded-lg"
        :class="iconBgClass"
      >
        <UIcon :name="icon" :class="iconClass" class="text-2xl" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";
}>();

const iconBgClass = computed(() => {
  const colors = {
    primary: "bg-blue-500/10",
    secondary: "bg-purple-500/10",
    success: "bg-green-500/10",
    info: "bg-blue-500/10",
    warning: "bg-amber-500/10",
    error: "bg-red-500/10",
    neutral: "bg-gray-500/10",
  };
  return colors[props.color || "primary"];
});

const iconClass = computed(() => {
  const colors = {
    primary: "text-blue-500",
    secondary: "text-purple-500",
    success: "text-green-500",
    info: "text-blue-500",
    warning: "text-amber-500",
    error: "text-red-500",
    neutral: "text-gray-500",
  };
  return colors[props.color || "primary"];
});
</script>
