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
const { data: reviewData, refresh } = await useApi(
  `/reviews/${reviewId}`,
);

const review = computed(() => (reviewData.value as any)?.review);

watchEffect(() => {
  if (review.value) {
    console.log(
      "[ReviewDetail] review object keys:",
      Object.keys(review.value),
    );
    console.log(
      "[ReviewDetail] review.name:",
      review.value.name,
      "| type:",
      typeof review.value.name,
    );
    console.log(
      "[ReviewDetail] full review:",
      JSON.stringify(review.value, null, 2),
    );
  }
});

useHead({
  title: computed(() => review.value?.name || "Review Details"),
});
const feedback = computed(() => (reviewData.value as any)?.feedback || []);
const goals = computed(() => (reviewData.value as any)?.goals || []);

// Fetch achievements for this review
const { data: achievementsData } = await useApi(
  `/achievements/for-review/${reviewId}`,
);
const achievements = computed(() => achievementsData.value?.achievements || []);

// Complete review modal state
const isCompleteModalOpen = ref(false);
const completionNotes = ref("");
const showCompletionSuccess = ref(false);

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
  return currentUser.value?.role === "admin";
});

const isCompleted = computed(() => review.value?.status === "completed");

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
    editScheduledDate.value = formatTz(utcDate, "yyyy-MM-dd", {
      timeZone: userTz,
    });
    // Extract time in user's timezone
    editScheduledTime.value = formatTz(utcDate, "HH:mm", { timeZone: userTz });

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
    const [datePart, timePart] = dateTimeString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // Create UTC timestamp for this date/time
    const utcMs = Date.UTC(year, month - 1, day, hours, minutes);

    // Get timezone offset for this date (handles DST automatically)
    const offset = getTimezoneOffset(userTz, new Date(year, month - 1, day));

    // Subtract offset to convert from user's timezone to UTC
    const correctUtcMs = utcMs - offset;
    const utcDateString = new Date(correctUtcMs).toISOString();

    await $api(`/reviews/${reviewId}`, {
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
    await $api(`/reviews/${reviewId}/complete`, {
      method: "PATCH",
      body: { completionNotes: completionNotes.value },
    });
    await refresh();
    isCompleteModalOpen.value = false;
    showCompletionSuccess.value = true;
  } catch (error) {
    console.error("Failed to complete review:", error);
    toast.add({
      title: "Failed to complete review",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

// Re-open review
const isReopening = ref(false);
const reopenReview = async () => {
  isReopening.value = true;
  try {
    await $api(`/reviews/${reviewId}/reopen`, {
      method: "PATCH",
    });
    await refresh();
    toast.add({
      title: "Review re-opened",
      description: "The review is now editable again",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to re-open review:", error);
    toast.add({
      title: "Failed to re-open review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isReopening.value = false;
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
  console.log(
    "[ReviewDetail] openFeedbackModal called with:",
    JSON.stringify(feedbackItem, null, 2),
  );
  console.log("[ReviewDetail] has reviewer?", !!feedbackItem?.reviewer);
  console.log("[ReviewDetail] has reviewee?", !!feedbackItem?.reviewee);
  console.log("[ReviewDetail] has content?", !!feedbackItem?.content);
  selectedFeedback.value = feedbackItem;
  isFeedbackModalOpen.value = true;
};

// Reflection state
const buddyComments = ref("");
const revieweeComments = ref("");

// Dynamic reflection state driven by the review's template snapshot
const answers = ref<Record<string, string>>({});
const selfScore = ref<number | null>(null);

const snapshotFields = computed(
  () =>
    (review.value?.templateSnapshot ?? []) as Array<{
      id: string;
      type: "long_text" | "multiple_choice" | "section";
      label: string;
      helpText?: string;
      required: boolean;
      options?: string[];
    }>,
);

const hasSnapshotFields = computed(() => snapshotFields.value.length > 0);

const legacyReflections = computed(() => {
  const r = review.value;
  if (!r) return [] as Array<{ label: string; icon: string; content: string }>;
  const items: Array<{ label: string; icon: string; content: string }> = [];
  if (r.reflectionLearnings)
    items.push({
      label: "What have I learnt in the past three months?",
      icon: "i-heroicons-academic-cap",
      content: r.reflectionLearnings,
    });
  if (r.reflectionHighlights)
    items.push({
      label: "Any highlights?",
      icon: "i-heroicons-star",
      content: r.reflectionHighlights,
    });
  if (r.reflectionConcerns)
    items.push({
      label: "Are you worried about anything right now?",
      icon: "i-heroicons-exclamation-triangle",
      content: r.reflectionConcerns,
    });
  return items;
});

// Initialize reflection state from review data
watch(
  () => review.value,
  (newReview) => {
    if (newReview) {
      buddyComments.value = newReview.buddyComments || "";
      revieweeComments.value = newReview.revieweeComments || "";
      answers.value = { ...(newReview.answers ?? {}) };
      selfScore.value = newReview.selfScore ?? null;
    }
  },
  { immediate: true },
);

// Per-field debounce timers for dynamic answer auto-save
const answerTimers = new Map<string, ReturnType<typeof setTimeout>>();

const saveAnswers = async () => {
  if (!review.value) return;
  try {
    await $api(`/reviews/${reviewId}`, {
      method: "PATCH",
      body: { answers: answers.value },
    });
  } catch (error) {
    console.error("Failed to save answers:", error);
    toast.add({
      title: "Failed to save changes",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

const onAnswerChange = (fieldId: string, value: string) => {
  answers.value = { ...answers.value, [fieldId]: value };
  clearTimeout(answerTimers.get(fieldId));
  answerTimers.set(fieldId, setTimeout(saveAnswers, 800));
};

// Cancel any pending debounced answer saves when leaving the page so the
// timer can't fire against a stale reviewId after unmount.
onUnmounted(() => {
  answerTimers.forEach((timer) => clearTimeout(timer));
});

const saveSelfScore = async (value: number | null) => {
  selfScore.value = value;
  if (!review.value) return;
  try {
    await $api(`/reviews/${reviewId}`, {
      method: "PATCH",
      body: { selfScore: value },
    });
  } catch (error) {
    console.error("Failed to save self-score:", error);
    toast.add({
      title: "Failed to save changes",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

// Auto-save logic
const isSavingReflections = ref(false);
const isSavingBuddyComments = ref(false);
// Per-field debounce timers so edits on different fields don't clobber each other.
const saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
// Per-field AbortController so rapid edits cancel the prior in-flight save
// and only the latest PATCH can land. Prevents stale-save races.
const saveControllers = new Map<string, AbortController>();

const saveReflection = async (field: string, value: string) => {
  if (!review.value) return;

  const isBuddyComment = field === "buddyComments";
  if (isBuddyComment) {
    isSavingBuddyComments.value = true;
  } else {
    isSavingReflections.value = true;
  }

  // Cancel any in-flight save for this field before starting a new one.
  saveControllers.get(field)?.abort();
  const controller = new AbortController();
  saveControllers.set(field, controller);

  try {
    await $api(`/reviews/${reviewId}`, {
      method: "PATCH",
      body: {
        [field]: value,
      },
      signal: controller.signal,
    });
  } catch (error) {
    // AbortError just means a newer save superseded this one — ignore.
    if ((error as Error)?.name === "AbortError") return;
    console.error(`Failed to save ${field}:`, error);
    toast.add({
      title: "Failed to save changes",
      description: "Please check your connection and try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    // Only clear the loading flag if this is still the active controller.
    if (saveControllers.get(field) === controller) {
      saveControllers.delete(field);
      if (isBuddyComment) {
        isSavingBuddyComments.value = false;
      } else {
        isSavingReflections.value = false;
      }
    }
  }
};

const debouncedSave = (field: string, value: string) => {
  const existing = saveTimeouts.get(field);
  if (existing) clearTimeout(existing);

  const isBuddyComment = field === "buddyComments";
  if (isBuddyComment) {
    isSavingBuddyComments.value = true;
  } else {
    isSavingReflections.value = true;
  }

  saveTimeouts.set(
    field,
    setTimeout(() => {
      saveTimeouts.delete(field);
      saveReflection(field, value);
    }, 1000),
  );
};

// Watch for changes to trigger auto-save
// Only watch if the user has permission to edit that field to avoid unnecessary saves on load
watch(buddyComments, (newValue, oldValue) => {
  if (
    (isReviewee.value || isBuddy.value) &&
    !isCompleted.value &&
    newValue !== (review.value?.buddyComments || "") &&
    oldValue !== ""
  ) {
    debouncedSave("buddyComments", newValue);
  }
});

watch(revieweeComments, (newValue, oldValue) => {
  if (
    (isReviewee.value || isBuddy.value) &&
    !isCompleted.value &&
    newValue !== (review.value?.revieweeComments || "") &&
    oldValue !== ""
  ) {
    debouncedSave("revieweeComments", newValue);
  }
});

</script>

<template>
  <UDashboardPanel id="review-detail">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <div v-if="!review" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>

        <!-- Completion Success State -->
        <div
          v-else-if="showCompletionSuccess"
          class="max-w-md mx-auto text-center py-20 space-y-8"
        >
          <div class="relative w-24 h-24 mx-auto">
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-teal-500/20 animate-ping"
              style="animation-duration: 2s"
            />
            <div
              class="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-xl shadow-primary-500/25"
            >
              <UIcon name="i-heroicons-check" class="w-12 h-12 text-white" />
            </div>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Review Completed!
            </h1>
            <p class="text-gray-500 dark:text-gray-400">
              The review for
              <span class="font-semibold text-gray-900 dark:text-white">{{
                review?.user?.name || review?.name
              }}</span>
              has been marked as complete.
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <UButton
              color="primary"
              size="lg"
              :to="isBuddy ? '/buddies/reviews' : '/reviews'"
            >
              {{ isBuddy ? "Back to Buddy Reviews" : "Schedule Next Review" }}
            </UButton>
            <UButton
              :to="isBuddy ? '/buddies/goals' : '/goals'"
              variant="soft"
              size="lg"
              icon="i-heroicons-flag"
            >
              Review Goals
            </UButton>
            <UButton to="/dashboard" variant="ghost" color="neutral" size="lg">
              Back to Dashboard
            </UButton>
          </div>
        </div>

        <div v-else>
          <!-- Hero Header -->
          <div
            class="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 dark:from-gray-800 dark:to-gray-900 text-white p-8 mb-8 shadow-lg"
          >
            <!-- Background Decoration -->
            <div
              class="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"
            />
            <div
              class="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
            />

            <div class="relative z-10">
              <div
                class="flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <!-- Title and Date -->
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <UBadge
                      :label="
                        review.status === 'completed'
                          ? 'Completed'
                          : 'Scheduled'
                      "
                      variant="solid"
                      :class="[
                        'capitalize',
                        review.status === 'completed'
                          ? '!bg-green-500 !text-white'
                          : '!bg-blue-500 !text-white',
                      ]"
                    />
                    <span class="text-white/80 text-sm font-medium">{{
                      formatDate(review.scheduledDate)
                    }}</span>
                  </div>
                  <h1 class="text-3xl sm:text-4xl md:text-4xl font-bold mb-2">
                    {{ review.name || "Quarterly Review" }}
                  </h1>
                </div>

                <!-- Buddy Card -->
                <div
                  class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[240px]"
                >
                  <UAvatar
                    :src="review.buddy?.avatarUrl"
                    :alt="review.buddy?.name"
                    size="md"
                    class="ring-2 ring-white/20"
                  />
                  <div>
                    <p
                      class="text-xs text-white/70 uppercase tracking-wider font-semibold mb-0.5"
                    >
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
                  @click="isCompleteModalOpen = true"
                >
                  Mark as Completed
                </UButton>
                <UButton
                  v-if="(isBuddy || isAdmin) && review.status === 'completed'"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-arrow-path"
                  class="!bg-white/10 !text-white hover:!bg-white/20 cursor-pointer"
                  :loading="isReopening"
                  @click="reopenReview"
                >
                  Re-open Review
                </UButton>
                <UButton
                  v-if="(isBuddy || isAdmin) && review.status === 'scheduled'"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  class="!bg-white/10 !text-white hover:!bg-white/20 cursor-pointer"
                  @click="openEditModal"
                >
                  Edit Details
                </UButton>
                <UButton
                  v-if="review.status === 'scheduled'"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-calendar"
                  class="!bg-white/10 !text-white hover:!bg-white/20 cursor-pointer"
                  @click="downloadICalFile(review)"
                >
                  Add to Calendar
                </UButton>
              </div>
            </div>
          </div>

          <!-- Two-column layout: editors on the left, supporting data sticky on the right.
               We only split at xl: (1280px) so narrow desktops / iPad-landscape don't get crushed. -->
          <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
            <div class="min-w-0">
          <!-- Reflections Section -->
          <UCard class="mb-6">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-light-bulb"
                    class="w-5 h-5 text-primary-500"
                  />
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Reflections
                  </h3>
                </div>
                <div
                  v-if="isSavingReflections"
                  class="flex items-center gap-2 text-sm text-gray-500"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-4 h-4 animate-spin"
                  />
                  Saving...
                </div>
              </div>
            </template>

            <div class="space-y-6">
              <template v-if="hasSnapshotFields">
                <DynamicReflectionField
                  v-for="field in snapshotFields"
                  :key="field.id"
                  :field="field"
                  :model-value="answers[field.id] || ''"
                  :readonly="(!isReviewee && !isBuddy) || isCompleted"
                  @update:model-value="(v) => onAnswerChange(field.id, v)"
                />
              </template>

              <!-- Legacy fallback: reviews with no template snapshot (pre-backfill / seed data) -->
              <template v-else>
                <ReviewsReflectionEditor
                  v-for="item in legacyReflections"
                  :key="item.label"
                  :model-value="item.content"
                  :label="item.label"
                  :icon="item.icon"
                  readonly
                />
                <p
                  v-if="!legacyReflections.length"
                  class="text-sm text-gray-500"
                >
                  No reflections recorded.
                </p>
              </template>

              <SelfScoreField
                :model-value="selfScore"
                :readonly="!isReviewee || isCompleted"
                @update:model-value="saveSelfScore"
              />
            </div>
          </UCard>

          <!-- Reviewee Additional Comments Section -->
          <UCard class="mb-6">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-pencil-square"
                    class="w-5 h-5 text-primary-500"
                  />
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Additional Comments
                  </h3>
                </div>
                <div
                  v-if="isSavingReflections"
                  class="flex items-center gap-2 text-sm text-gray-500"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-4 h-4 animate-spin"
                  />
                  Saving...
                </div>
              </div>
            </template>

            <ReviewsReflectionEditor
              v-model="revieweeComments"
              label="Anything else you'd like to add?"
              icon="i-heroicons-chat-bubble-left-ellipsis"
              placeholder="Any other thoughts, questions, or comments for your buddy..."
              :readonly="(!isReviewee && !isBuddy) || isCompleted"
            />
          </UCard>

          <!-- Buddy Comments Section -->
          <UCard class="mb-6">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-chat-bubble-bottom-center-text"
                    class="w-5 h-5 text-primary-500"
                  />
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Buddy Comments
                  </h3>
                </div>
                <div
                  v-if="isSavingBuddyComments"
                  class="flex items-center gap-2 text-sm text-gray-500"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-4 h-4 animate-spin"
                  />
                  Saving...
                </div>
              </div>
            </template>

            <ReviewsReflectionEditor
              v-model="buddyComments"
              label="Notes from your buddy"
              icon="i-heroicons-user"
              placeholder="Add comments about the review..."
              :readonly="(!isReviewee && !isBuddy) || isCompleted"
            />
          </UCard>

            </div>
            <!-- end left column -->

            <!-- Sidebar column -->
            <aside class="mt-6 xl:mt-0">
              <div
                class="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:rounded-xl"
              >
                <ReviewsSupportingDataSidebar
                  :feedback="feedback"
                  :goals="goals"
                  :achievements="achievements"
                  :is-reviewee="isReviewee"
                  :format-date="formatDate"
                  @open-feedback="openFeedbackModal"
                />
              </div>
            </aside>
          </div>
          <!-- end two-column grid -->

          <!-- Bottom CTA: Mark as Complete -->
          <div
            v-if="(isBuddy || isAdmin) && review.status === 'scheduled'"
            class="mt-10 text-center py-8"
          >
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              All done? Mark this review as complete.
            </p>
            <UButton
              color="primary"
              size="lg"
              icon="i-heroicons-check"
              @click="isCompleteModalOpen = true"
            >
              Mark as Completed
            </UButton>
          </div>

          <!-- Bottom CTA: Re-open Review -->
          <div
            v-if="(isBuddy || isAdmin) && review.status === 'completed'"
            class="mt-10 text-center py-8"
          >
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              Need to make changes? Re-open this review.
            </p>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-arrow-path"
              :loading="isReopening"
              @click="reopenReview"
            >
              Re-open Review
            </UButton>
          </div>

          <!-- Completion Notes (if completed) -->
          <UCard
            v-if="review.status === 'completed' && review.completionNotes"
            class="mt-6 bg-primary-50 dark:bg-primary-900/10 ring-1 ring-primary-200 dark:ring-primary-800"
          >
            <div class="flex items-start gap-4">
              <UAvatar
                :src="review.buddy?.avatarUrl"
                :alt="review.buddy?.name"
                size="md"
                class="ring-2 ring-white dark:ring-gray-900"
              />
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    Review Summary from {{ review.buddy?.name }}
                  </h3>
                  <span
                    v-if="review.completedDate"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
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
        v-model:open="isCompleteModalOpen"
        title="Complete Review"
        :ui="{
          footer: 'justify-end',
        }"
      >
        <template #body>
          <UTextarea
            v-model="completionNotes"
            class="w-full"
            placeholder="Add summary notes (optional)"
            :rows="6"
          />
        </template>

        <template #footer>
          <UButton variant="ghost" @click="isCompleteModalOpen = false">
            Cancel
          </UButton>
          <UButton @click="completeReview"> Complete Review </UButton>
        </template>
      </UModal>

      <!-- Feedback Modal -->
      <FeedbackModal
        v-model="isFeedbackModalOpen"
        :feedback="selectedFeedback"
        :show-mark-as-read="false"
      />

      <!-- Edit Review Modal -->
      <UModal
        v-model:open="isEditModalOpen"
        title="Edit Review"
        class="sm:max-w-2xl"
        :ui="{
          footer: 'justify-end',
        }"
      >
        <template #body>
          <div class="space-y-4">
            <!-- Scheduled Date -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Scheduled Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="editScheduledDate"
                type="date"
                :min="new Date().toISOString().split('T')[0]"
              />
            </div>

            <!-- Include Time Checkbox -->
            <div class="flex items-center gap-2">
              <UCheckbox v-model="editIncludeTime" />
              <label
                class="text-sm font-medium cursor-pointer"
                @click="editIncludeTime = !editIncludeTime"
              >
                Schedule at specific time
              </label>
            </div>

            <!-- Time Picker (conditional) -->
            <div v-if="editIncludeTime">
              <label class="block text-sm font-medium mb-2"> Time </label>
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
              <UInput
                v-model="editReviewName"
                placeholder="e.g., January 2026"
                size="lg"
              />
            </div>
          </div>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="isEditing"
            @click="isEditModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isEditing"
            :disabled="!editScheduledDate"
            @click="updateReview"
          >
            Save Changes
          </UButton>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
