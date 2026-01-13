<script setup lang="ts">
const props = defineProps<{
  review: {
    id: string;
    name: string;
    scheduledDate: string;
    status: string;
    buddy?: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  };
  index: number;
}>();

const { getDaysUntilText, getDateColorClass, formatDate } = useReviewHelpers();
</script>

<template>
  <UCard
    :class="
      index === 0
        ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'
        : 'bg-gray-50 dark:bg-gray-800'
    "
  >
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ review.name }}
          </h3>
          <UBadge
            v-if="index === 0"
            label="Next"
            color="primary"
            variant="subtle"
          />
          <UBadge v-else :label="review.status" color="neutral" variant="subtle" />
        </div>

        <div
          class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
        >
          <div class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
            <span>{{ formatDate(review.scheduledDate) }}</span>
          </div>
          <div
            class="flex items-center gap-1.5"
            :class="getDateColorClass(review.scheduledDate)"
          >
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            <span>{{ getDaysUntilText(review.scheduledDate) }}</span>
          </div>
        </div>

        <!-- Slot for buddy info or other metadata -->
        <slot name="metadata" :review="review" />
      </div>

      <!-- Slot for actions (View Details button, dropdown menu, etc.) -->
      <slot name="actions" :review="review" />
    </div>
  </UCard>
</template>
