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
  color?: "blue" | "green" | "purple" | "amber" | "red";
}>();

const iconBgClass = computed(() => {
  const colors = {
    blue: "bg-blue-500/10",
    green: "bg-green-500/10",
    purple: "bg-purple-500/10",
    amber: "bg-amber-500/10",
    red: "bg-red-500/10",
  };
  return colors[props.color || "blue"];
});

const iconClass = computed(() => {
  const colors = {
    blue: "text-blue-500",
    green: "text-green-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };
  return colors[props.color || "blue"];
});
</script>
