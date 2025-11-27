<script setup lang="ts">
import { format } from "date-fns";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const toast = useToast();
const reviewId = route.params.id as string;

// Fetch review data
const { data: reviewData, refresh } = await useFetch(
  `/api/reviews/${reviewId}`,
);

const review = computed(() => reviewData.value?.review);
const feedback = computed(() => reviewData.value?.feedback || []);
const goals = computed(() => reviewData.value?.goals || []);

// Fetch achievements for this review
const { data: achievementsData } = await useFetch(
  `/api/achievements/for-review/${reviewId}`,
);
const achievements = computed(() => achievementsData.value?.achievements || []);

// Tab state
const selectedTab = ref("feedback");

// Complete review modal state
const isCompleteModalOpen = ref(false);
const completionNotes = ref("");

// Complete review
const completeReview = async () => {
  try {
    await $fetch(`/api/reviews/${reviewId}/complete`, {
      method: "PATCH",
      body: { completionNotes: completionNotes.value },
    });
    await refresh();
    isCompleteModalOpen.value = false;
    toast.add({
      title: "Review completed",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to complete review:", error);
    toast.add({
      title: "Failed to complete review",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

const formatDate = (date: string) => {
  return format(new Date(date), "MMM d, yyyy");
};

// Modal state for feedback
const isFeedbackModalOpen = ref(false);
const selectedFeedback = ref<any>(null);

// Open feedback modal
const openFeedbackModal = (feedbackItem: any) => {
  selectedFeedback.value = feedbackItem;
  isFeedbackModalOpen.value = true;
};

// Tabs with dynamic counts
const tabs = computed(() => [
  { label: `Feedback (${feedback.value.length})`, value: "feedback" },
  { label: `Goals (${goals.value.length})`, value: "goals" },
  {
    label: `Achievements (${achievements.value.length})`,
    value: "achievements",
  },
]);

// Feedback table columns
const feedbackColumns = [
  { id: "from", accessorKey: "reviewer", header: "From" },
  {
    id: "content",
    accessorKey: "content",
    header: "Feedback",
    meta: {
      class: {
        td: "max-w-md",
      },
    },
  },
  { id: "date", accessorKey: "createdAt", header: "Date" },
];
</script>

<template>
  <UDashboardPanel id="review-detail">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <div v-if="!review" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>

        <div v-else>
          <!-- Header -->
          <div class="mb-8">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ review.name }}
                </h1>
                <p class="mt-2 text-gray-600 dark:text-gray-400">
                  {{ formatDate(review.scheduledDate) }}
                </p>
              </div>
              <UBadge
                :label="review.status"
                :color="review.status === 'completed' ? 'success' : 'primary'"
                size="lg"
              />
            </div>

            <div class="flex items-center gap-4 mb-6">
              <div class="flex items-center gap-2">
                <UAvatar
                  :src="review.buddy?.avatarUrl"
                  :alt="review.buddy?.name"
                  size="sm"
                />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ review.buddy?.name }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Buddy</p>
                </div>
              </div>
            </div>

            <UButton
              v-if="review.status === 'scheduled'"
              @click="isCompleteModalOpen = true"
            >
              Mark as Completed
            </UButton>
          </div>

          <!-- Review Notes (if present) -->
          <UCard v-if="review.notes" class="mb-6">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
              Review Notes
            </h3>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {{ review.notes }}
            </p>
          </UCard>

          <!-- Tabs -->
          <UTabs v-model="selectedTab" :items="tabs" class="mb-6" />

          <!-- Tab Content -->
          <div class="mt-6">
            <!-- Feedback Tab -->
            <div v-if="selectedTab === 'feedback'">
              <UCard>
                <div v-if="feedback.length === 0" class="text-center py-12">
                  <UIcon
                    name="i-heroicons-chat-bubble-left"
                    class="text-gray-400 text-4xl mb-2"
                  />
                  <p
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    No feedback for this review
                  </p>
                </div>

                <UTable v-else :columns="feedbackColumns" :data="feedback">
                  <template #from-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
                        :src="row.original.reviewer.avatarUrl || undefined"
                        :alt="row.original.reviewer.name"
                        size="xs"
                      />
                      <span>{{ row.original.reviewer.name }}</span>
                    </div>
                  </template>

                  <template #content-cell="{ row }">
                    <UButton
                      variant="ghost"
                      color="neutral"
                      class="w-full truncate text-left justify-start font-normal px-0 -mx-2.5 block overflow-hidden"
                      @click="openFeedbackModal(row.original)"
                    >
                      <span class="truncate block">{{
                        row.original.content
                      }}</span>
                    </UButton>
                  </template>

                  <template #date-cell="{ row }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                      {{ formatDate(row.original.createdAt) }}
                    </span>
                  </template>
                </UTable>
              </UCard>
            </div>

            <!-- Goals Tab -->
            <div v-else-if="selectedTab === 'goals'">
              <UCard>
                <div v-if="goals.length === 0" class="text-center py-12">
                  <UIcon
                    name="i-heroicons-flag"
                    class="text-gray-400 text-4xl mb-2"
                  />
                  <p
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    No goals
                  </p>
                </div>

                <div v-else class="space-y-4">
                  <div
                    v-for="goal in goals"
                    :key="goal.id"
                    class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ goal.goalText }}
                        </p>
                        <div class="flex items-center gap-2 mt-2">
                          <UBadge :label="goal.status" size="xs" />
                          <span
                            v-if="goal.targetDate"
                            class="text-sm text-gray-500 dark:text-gray-400"
                          >
                            Target: {{ formatDate(goal.targetDate) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Achievements Tab -->
            <div v-else-if="selectedTab === 'achievements'">
              <UCard>
                <div v-if="achievements.length === 0" class="text-center py-12">
                  <UIcon
                    name="i-heroicons-star"
                    class="text-gray-400 text-4xl mb-2"
                  />
                  <p
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    No achievements recorded
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Achievements added to the Brag Bucket will appear here
                  </p>
                </div>

                <div v-else class="space-y-4">
                  <div
                    v-for="achievement in achievements"
                    :key="achievement.id"
                    class="p-4 border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-900/20 rounded-lg"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ achievement.title }}
                        </p>
                        <p
                          class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                        >
                          {{ formatDate(achievement.achievedDate) }}
                        </p>
                        <p
                          v-if="achievement.description"
                          class="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                        >
                          {{ achievement.description }}
                        </p>
                      </div>
                      <div class="flex-shrink-0 text-2xl ml-4">
                        <UIcon
                          name="i-heroicons-star"
                          class="text-gray-400 text-4xl mb-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <!-- Completion Notes (if completed) -->
          <UCard
            v-if="review.status === 'completed' && review.completionNotes"
            class="mt-6"
          >
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
              Review Summary
            </h3>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {{ review.completionNotes }}
            </p>
          </UCard>
        </div>
      </div>
      <!-- Complete Review Modal -->
      <UModal v-model:open="isCompleteModalOpen">
        <template #body>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">Complete Review</h3>
            </template>

            <UTextarea
              v-model="completionNotes"
              placeholder="Add summary notes (optional)"
              :rows="6"
              class="mb-4"
            />

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton variant="ghost" @click="isCompleteModalOpen = false">
                  Cancel
                </UButton>
                <UButton @click="completeReview"> Complete Review </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Feedback Modal -->
      <FeedbackModal
        v-model="isFeedbackModalOpen"
        :feedback="selectedFeedback"
        :show-mark-as-read="false"
      />
    </template>
  </UDashboardPanel>
</template>
