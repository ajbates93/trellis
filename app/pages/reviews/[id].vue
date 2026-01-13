<script setup lang="ts">
import { format } from "date-fns";
import { getTimezoneOffset, format as formatTz } from "date-fns-tz";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const toast = useToast();
const reviewId = route.params.id as string;
const { downloadICalFile } = useCalendarExport();
const { formatDateInUserTZ } = useUserTimezone();

// Fetch review data
const { data: reviewData, refresh } = await useFetch(
  `/api/reviews/${reviewId}`,
);

const review = computed(() => (reviewData.value as any)?.review);

useHead({
  title: computed(() => review.value?.name || "Review Details"),
});
const feedback = computed(() => (reviewData.value as any)?.feedback || []);
const goals = computed(() => (reviewData.value as any)?.goals || []);

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

// Edit review modal state
const isEditModalOpen = ref(false);
const editScheduledDate = ref<string>("");
const editScheduledTime = ref<string>("09:00");
const editIncludeTime = ref(false);
const editReviewName = ref<string>("");
const isEditing = ref(false);

// Get current user session
const { user: currentUser } = useAuth();

// Check if current user is the reviewee for this review
const isReviewee = computed(() => {
  return review.value?.userId === currentUser.value?.id;
});

// Check if current user is the buddy for this review
const isBuddy = computed(() => {
  return review.value?.buddyId === currentUser.value?.id;
});

const isAdmin = computed(() => {
  return currentUser.value?.role === 'admin';
});

// Open edit modal
const openEditModal = () => {
  if (!review.value) return;

  if (review.value.scheduledDate) {
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();
    const utcDate = new Date(review.value.scheduledDate);

    // Check if this is midnight UTC (all day event)
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    const isAllDay = utcHours === 0 && utcMinutes === 0;

    // Convert from UTC to user's configured timezone using date-fns-tz
    // Extract date in user's timezone
    editScheduledDate.value = formatTz(utcDate, 'yyyy-MM-dd', { timeZone: userTz });
    // Extract time in user's timezone
    editScheduledTime.value = formatTz(utcDate, 'HH:mm', { timeZone: userTz });

    editIncludeTime.value = !isAllDay;
  } else {
    editScheduledDate.value = "";
    editScheduledTime.value = "09:00";
    editIncludeTime.value = false;
  }

  editReviewName.value = review.value.name || "";
  isEditModalOpen.value = true;
};

// Update review
const updateReview = async () => {
  if (!editScheduledDate.value) {
    toast.add({
      title: "Missing required fields",
      description: "Please provide a scheduled date",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  isEditing.value = true;

  try {
    // Combine date and time if time is included, otherwise use midnight for "all day"
    const dateTimeString = editIncludeTime.value
      ? `${editScheduledDate.value}T${editScheduledTime.value}`
      : `${editScheduledDate.value}T00:00`;

    // Convert from user's configured timezone to UTC
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();

    // Parse date/time components
    const [datePart, timePart] = dateTimeString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create UTC timestamp for this date/time
    const utcMs = Date.UTC(year, month - 1, day, hours, minutes);

    // Get timezone offset for this date (handles DST automatically)
    const offset = getTimezoneOffset(userTz, new Date(year, month - 1, day));

    // Subtract offset to convert from user's timezone to UTC
    const correctUtcMs = utcMs - offset;
    const utcDateString = new Date(correctUtcMs).toISOString();

    await $fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: {
        scheduledDate: utcDateString,
        name: editReviewName.value,
      },
    });

    await refresh();
    isEditModalOpen.value = false;

    toast.add({
      title: "Review updated",
      description: "The review has been updated successfully",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to update review:", error);
    toast.add({
      title: "Failed to update review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isEditing.value = false;
  }
};

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

// Format date helper using user's configured timezone
const formatDate = (date: string) => {
  return formatDateInUserTZ(date);
};

// Modal state for feedback
const isFeedbackModalOpen = ref(false);
const selectedFeedback = ref<any>(null);

// Open feedback modal
const openFeedbackModal = (feedbackItem: any) => {
  selectedFeedback.value = feedbackItem;
  isFeedbackModalOpen.value = true;
};

// Reflection state
const reflectionLearnings = ref("");
const reflectionHighlights = ref("");
const reflectionConcerns = ref("");
const buddyComments = ref("");

// Initialize reflection state from review data
watch(
  () => review.value,
  (newReview) => {
    if (newReview) {
      reflectionLearnings.value = newReview.reflectionLearnings || "";
      reflectionHighlights.value = newReview.reflectionHighlights || "";
      reflectionConcerns.value = newReview.reflectionConcerns || "";
      buddyComments.value = newReview.buddyComments || "";
    }
  },
  { immediate: true },
);

// Auto-save logic
const isSavingReflections = ref(false);
const isSavingBuddyComments = ref(false);
const saveTimeout = ref<NodeJS.Timeout | null>(null);

const saveReflection = async (field: string, value: string) => {
  if (!review.value) return;

  const isBuddyComment = field === "buddyComments";
  if (isBuddyComment) {
    isSavingBuddyComments.value = true;
  } else {
    isSavingReflections.value = true;
  }

  try {
    await $fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      body: {
        [field]: value,
      },
    });
  } catch (error) {
    console.error(`Failed to save ${field}:`, error);
    toast.add({
      title: "Failed to save changes",
      description: "Please check your connection and try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    if (isBuddyComment) {
      isSavingBuddyComments.value = false;
    } else {
      isSavingReflections.value = false;
    }
  }
};

const debouncedSave = (field: string, value: string) => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }

  const isBuddyComment = field === "buddyComments";
  if (isBuddyComment) {
    isSavingBuddyComments.value = true;
  } else {
    isSavingReflections.value = true;
  }

  saveTimeout.value = setTimeout(() => {
    saveReflection(field, value);
  }, 1000); // 1 second debounce
};

// Watch for changes to trigger auto-save
// Only watch if the user has permission to edit that field to avoid unnecessary saves on load
watch(reflectionLearnings, (newValue, oldValue) => {
  if (
    isReviewee.value &&
    newValue !== (review.value?.reflectionLearnings || "") &&
    oldValue !== ""
  ) {
    debouncedSave("reflectionLearnings", newValue);
  }
});

watch(reflectionHighlights, (newValue, oldValue) => {
  if (
    isReviewee.value &&
    newValue !== (review.value?.reflectionHighlights || "") &&
    oldValue !== ""
  ) {
    debouncedSave("reflectionHighlights", newValue);
  }
});

watch(reflectionConcerns, (newValue, oldValue) => {
  if (
    isReviewee.value &&
    newValue !== (review.value?.reflectionConcerns || "") &&
    oldValue !== ""
  ) {
    debouncedSave("reflectionConcerns", newValue);
  }
});

watch(buddyComments, (newValue, oldValue) => {
  if (
    isBuddy.value &&
    newValue !== (review.value?.buddyComments || "") &&
    oldValue !== ""
  ) {
    debouncedSave("buddyComments", newValue);
  }
});

// Tabs with dynamic counts
const tabs = computed(() => [
  {
    label: `Feedback (${feedback.value.length})`,
    value: "feedback",
    icon: "i-heroicons-chat-bubble-left-right",
  },
  {
    label: `Goals (${goals.value.length})`,
    value: "goals",
    icon: "i-heroicons-flag",
  },
  {
    label: `Achievements (${achievements.value.length})`,
    value: "achievements",
    icon: "i-heroicons-star",
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
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <div v-if="!review" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>

        <div v-else>
          <!-- Hero Header -->
          <div
            class="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white p-8 mb-8 shadow-lg">
            <!-- Background Decoration -->
            <div class="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"/>
            <div class="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"/>

            <div class="relative z-10">
              <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <!-- Title and Date -->
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <UBadge
:label="review.status === 'completed'
                      ? 'Completed'
                      : 'Scheduled'
                      " variant="solid" :class="[
                        'capitalize',
                        review.status === 'completed'
                          ? '!bg-green-500 !text-white'
                          : '!bg-blue-500 !text-white',
                      ]" />
                    <span class="text-gray-400 text-sm font-medium">{{
                      formatDate(review.scheduledDate)
                      }}</span>
                  </div>
                  <h1 class="text-3xl sm:text-4xl md:text-4xl font-bold mb-2">
                    {{ review.name || "Quarterly Review" }}
                  </h1>
                </div>

                <!-- Buddy Card -->
                <div class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[240px]">
                  <UAvatar
:src="review.buddy?.avatarUrl" :alt="review.buddy?.name" size="md"
                    class="ring-2 ring-white/20" />
                  <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                      Your Buddy
                    </p>
                    <p class="font-medium text-white">
                      {{ review.buddy?.name || "Unassigned" }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-8 flex gap-3">
                <UButton
                  v-if="(isBuddy || isAdmin) && review.status === 'scheduled'"
                  color="neutral"
                  variant="solid"
                  icon="i-heroicons-check"
                  class="!bg-white !text-gray-900 hover:!bg-gray-100 border-none cursor-pointer"
                  @click="isCompleteModalOpen = true">
                  Mark as Completed
                </UButton>
                <UButton
                  v-if="(isBuddy || isAdmin) && review.status === 'scheduled'"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  class="!bg-white/10 !text-white hover:!bg-white/20 cursor-pointer"
                  @click="openEditModal">
                  Edit Details
                </UButton>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-calendar"
                  class="!bg-white/10 !text-white hover:!bg-white/20 cursor-pointer"
                  @click="downloadICalFile(review)">
                  Add to Calendar
                </UButton>
              </div>
            </div>
          </div>

          <!-- Reflections Section -->
          <UCard class="mb-6">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-primary-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Reflections
                  </h3>
                </div>
                <div v-if="isSavingReflections" class="flex items-center gap-2 text-sm text-gray-500">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              </div>
            </template>

            <div class="space-y-6">
              <ReviewsReflectionEditor
v-model="reflectionLearnings"
                label="What have I learnt in the past three months?" icon="i-heroicons-academic-cap"
                placeholder="Think about technical skills, soft skills, or domain knowledge..."
                :readonly="!isReviewee" />

              <ReviewsReflectionEditor
v-model="reflectionHighlights" label="Any highlights?" icon="i-heroicons-star"
                placeholder="Projects delivered, problems solved, or team contributions..." :readonly="!isReviewee" />

              <ReviewsReflectionEditor
v-model="reflectionConcerns" label="Are you worried about anything right now?"
                icon="i-heroicons-exclamation-triangle"
                placeholder="Blockers, uncertainties, or support you might need..." :readonly="!isReviewee" />
            </div>
          </UCard>

          <!-- Buddy Comments Section -->
          <UCard class="mb-6">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-5 h-5 text-primary-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Buddy Comments
                  </h3>
                </div>
                <div v-if="isSavingBuddyComments" class="flex items-center gap-2 text-sm text-gray-500">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              </div>
            </template>

            <ReviewsReflectionEditor
v-model="buddyComments" label="Notes from your buddy" icon="i-heroicons-user"
              placeholder="Add comments about the review..." :readonly="!isBuddy" />
          </UCard>

          <!-- Supporting Data Header -->
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Supporting Data
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Review feedback, goals, and achievements from this cycle to help
              write your reflections.
            </p>
          </div>

          <!-- Tabs -->
          <UTabs v-model="selectedTab" :items="tabs" class="mb-6" />

          <!-- Tab Content -->
          <div class="mt-6">
            <!-- Feedback Tab -->
            <div v-if="selectedTab === 'feedback'">
              <UCard>
                <div v-if="feedback.length === 0" class="text-center py-12">
                  <UIcon name="i-heroicons-chat-bubble-left" class="text-gray-400 text-4xl mb-2" />
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    No feedback for this review
                  </p>
                </div>

                <div v-else class="max-h-[500px] overflow-y-auto">
                  <UTable
:columns="feedbackColumns" :data="feedback"
                    :ui="{ th: { base: 'sticky top-0 z-10 bg-white dark:bg-gray-900' } }">
                    <template #from-cell="{ row }">
                      <div class="flex items-center gap-2">
                        <UAvatar
:src="row.original.reviewer.avatarUrl || undefined" :alt="row.original.reviewer.name"
                          size="xs" />
                        <span>{{ row.original.reviewer.name }}</span>
                      </div>
                    </template>

                    <template #content-cell="{ row }">
                      <UButton
variant="ghost" color="neutral"
                        class="w-full truncate text-left justify-start font-normal px-0 -mx-2.5 block overflow-hidden"
                        @click="openFeedbackModal(row.original)">
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
                </div>
              </UCard>
            </div>

            <!-- Goals Tab -->
            <div v-else-if="selectedTab === 'goals'">
              <UCard>
                <div v-if="goals.length === 0" class="text-center py-12">
                  <UIcon name="i-heroicons-flag" class="text-gray-400 text-4xl mb-2" />
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    No goals
                  </p>
                </div>

                <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
                  <NuxtLink
v-for="goal in goals" :key="goal.id" :to="isReviewee ? '/goals' : '/buddies/goals'"
                    class="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 first:-mt-4 last:-mb-4">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ goal.goalText }}
                        </p>
                        <div class="flex items-center gap-2 mt-2">
                          <UBadge :label="goal.status" size="xs" />
                          <span v-if="goal.targetDate" class="text-sm text-gray-500 dark:text-gray-400">
                            Target: {{ formatDate(goal.targetDate) }}
                          </span>
                        </div>
                      </div>
                      <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
                    </div>
                  </NuxtLink>
                </div>
              </UCard>
            </div>

            <!-- Achievements Tab -->
            <div v-else-if="selectedTab === 'achievements'">
              <UCard>
                <div v-if="achievements.length === 0" class="text-center py-12">
                  <UIcon name="i-heroicons-star" class="text-gray-400 text-4xl mb-2" />
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    No achievements recorded
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Achievements added to the Brag Bucket will appear here
                  </p>
                </div>

                <div v-else class="space-y-4">
                  <div
v-for="achievement in achievements" :key="achievement.id"
                    class="p-4 border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ achievement.title }}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {{ formatDate(achievement.achievedDate) }}
                        </p>
                        <p
v-if="achievement.description"
                          class="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {{ achievement.description }}
                        </p>
                      </div>
                      <div class="flex-shrink-0 text-2xl ml-4">
                        <UIcon name="i-heroicons-star" class="text-gray-400 text-4xl mb-2" />
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
            class="mt-6 bg-primary-50 dark:bg-primary-900/10 ring-1 ring-primary-200 dark:ring-primary-800">
            <div class="flex items-start gap-4">
              <UAvatar
:src="review.buddy?.avatarUrl" :alt="review.buddy?.name" size="md"
                class="ring-2 ring-white dark:ring-gray-900" />
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Review Summary from {{ review.buddy?.name }}
                  </h3>
                  <span v-if="review.completedDate" class="text-sm text-gray-500 dark:text-gray-400">
                    Review completed on {{ formatDate(review.completedDate) }}
                  </span>
                </div>
                <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {{ review.completionNotes }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
      <!-- Complete Review Modal -->
      <UModal
v-model:open="isCompleteModalOpen" title="Complete Review" :ui="{
        footer: 'justify-end',
      }">
        <template #body>
          <UTextarea v-model="completionNotes" class="w-full" placeholder="Add summary notes (optional)" :rows="6" />
        </template>

        <template #footer>
          <UButton variant="ghost" @click="isCompleteModalOpen = false">
            Cancel
          </UButton>
          <UButton @click="completeReview"> Complete Review </UButton>
        </template>
      </UModal>

      <!-- Feedback Modal -->
      <FeedbackModal v-model="isFeedbackModalOpen" :feedback="selectedFeedback" :show-mark-as-read="false" />

      <!-- Edit Review Modal -->
      <UModal
v-model:open="isEditModalOpen" title="Edit Review" class="sm:max-w-2xl" :ui="{
        footer: 'justify-end',
      }">
        <template #body>
          <div class="space-y-4">
            <!-- Scheduled Date -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Scheduled Date <span class="text-red-500">*</span>
              </label>
              <UInput v-model="editScheduledDate" type="date" :min="new Date().toISOString().split('T')[0]" />
            </div>

            <!-- Include Time Checkbox -->
            <div class="flex items-center gap-2">
              <UCheckbox v-model="editIncludeTime" />
              <label class="text-sm font-medium cursor-pointer" @click="editIncludeTime = !editIncludeTime">
                Schedule at specific time
              </label>
            </div>

            <!-- Time Picker (conditional) -->
            <div v-if="editIncludeTime">
              <label class="block text-sm font-medium mb-2">
                Time
              </label>
              <UInput v-model="editScheduledTime" type="time" class="w-auto" />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Review will be scheduled at {{ editScheduledTime }}
              </p>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
              Review will be shown as an all-day event
            </div>

            <!-- Review Name -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Review Name
              </label>
              <UInput v-model="editReviewName" placeholder="e.g., January 2026" size="lg" />
            </div>
          </div>
        </template>

        <template #footer>
          <UButton color="neutral" variant="ghost" :disabled="isEditing" @click="isEditModalOpen = false">
            Cancel
          </UButton>
          <UButton :loading="isEditing" :disabled="!editScheduledDate" @click="updateReview">
            Save Changes
          </UButton>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
