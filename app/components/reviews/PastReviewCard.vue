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

const { formatDate } = useReviewHelpers();

const displayName = computed(() => props.review.name || 'Quarterly Review');

console.log('[PastReviewCard] review prop:', JSON.stringify(props.review, null, 2));
console.log('[PastReviewCard] review.name:', props.review.name, '| type:', typeof props.review.name);
console.log('[PastReviewCard] displayName:', displayName.value);
</script>

<template>
  <NuxtLink
    :to="`/reviews/${review.id}`"
    class="block group"
  >
    <UCard
      class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
    >
      <div class="flex justify-between items-start mb-4">
        <UBadge
          :label="formatDate(review.completedDate || review.scheduledDate)"
          color="neutral"
          variant="solid"
        />
        <UIcon
          name="i-heroicons-arrow-right"
          class="text-gray-400 group-hover:text-primary-500"
        />
      </div>
      <h3 class="font-bold text-lg mb-1">{{ displayName }}</h3>

      <!-- Slot for metadata (buddy name, completion date, etc.) -->
      <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <slot name="metadata" :review="review" />
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
