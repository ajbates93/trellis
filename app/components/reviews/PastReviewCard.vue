<script setup lang="ts">
const props = defineProps<{
  review: {
    id: string;
    name: string;
    scheduledDate: string;
    completedDate?: string;
    completionNotes?: string;
    buddy?: {
      name: string;
    };
  };
}>();

const { formatDateInUserTZ } = useUserTimezone();

const displayName = computed(() => props.review.name || 'Quarterly Review');

const formatDateOnly = (date: string | null | undefined) => {
  if (!date) return '';
  return formatDateInUserTZ(date, undefined, false);
};
</script>

<template>
  <NuxtLink
    :to="`/reviews/${review.id}`"
    class="block group"
  >
    <UCard
      class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
    >
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-bold text-lg">{{ displayName }}</h3>
        <UIcon
          name="i-heroicons-arrow-right"
          class="text-gray-400 group-hover:text-primary-500 flex-shrink-0 mt-1"
        />
      </div>

      <div :class="['space-y-1 text-sm text-gray-500 dark:text-gray-400', review.completionNotes ? 'mb-4' : '']">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-blue-500" />
          Scheduled for: <span class="text-gray-700 dark:text-gray-300">{{ formatDateOnly(review.scheduledDate) }}</span>
        </div>
        <div v-if="review.completedDate" class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500" />
          Completed: <span class="text-gray-700 dark:text-gray-300">{{ formatDateOnly(review.completedDate) }}</span>
        </div>
      </div>

      <div
        v-if="review.completionNotes"
        class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
      >
        {{ review.completionNotes }}
      </div>
    </UCard>
  </NuxtLink>
</template>
