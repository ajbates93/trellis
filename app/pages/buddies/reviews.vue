<script setup lang="ts">
import { format } from "date-fns";
import { format as formatTz, fromZonedTime } from "date-fns-tz";

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

useHead({
  title: "Buddy Reviews",
});

const toast = useToast();
const { selectedBuddyId } = useSelectedBuddy();
const { getBuddyById } = useBuddies();
const { downloadICalFile } = useCalendarExport();

// Use shared review helpers
const { getStatusColor, formatDate } = useReviewHelpers();

// Get selected buddy info
const selectedBuddy = computed(() => {
  if (!selectedBuddyId.value) return null;
  return getBuddyById(selectedBuddyId.value);
});

/**
 * Local response shape for /reviews/upcoming and /reviews/past — the
 * query-string paths can't be matched against Nitro's typed routes. Mirrors
 * GetReviewsWithDetailsResponseSchema (serialized).
 */
interface ReviewParticipant {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleType: string | null;
}

interface ReviewWithDetails {
  id: string;
  userId: string;
  buddyId: string;
  scheduledDate: string;
  completedDate: string | null;
  status: string | null;
  name: string | null;
  notes: string | null;
  completionNotes?: string | null;
  reflectionLearnings?: string | null;
  reflectionHighlights?: string | null;
  reflectionConcerns?: string | null;
  createdAt: string;
  user: ReviewParticipant;
  buddy: ReviewParticipant;
  feedbackCount: number;
  checkins: {
    id: string;
    buddy: Omit<ReviewParticipant, "roleType">;
    notes: string;
    createdAt: string;
  }[];
}

interface ReviewsResponse {
  reviews: ReviewWithDetails[];
}

// Fetch upcoming reviews for buddy (reactive based on selectedBuddyId).
// Returning null skips the request until a buddy is selected; the route
// types only accept string, hence the assertions below.
const { data: upcomingData, refresh: refreshUpcoming } =
  useApi<ReviewsResponse>(
    (() =>
      selectedBuddyId.value
        ? `/reviews/upcoming?userId=${selectedBuddyId.value}`
        : null) as () => string,
  );
// Mapped onto the shape UpcomingReviewCard expects (non-null name/status,
// optional avatarUrl) while keeping the remaining API fields.
const upcomingReviews = computed(() =>
  (upcomingData.value?.reviews || []).map((review) => ({
    ...review,
    name: review.name ?? "",
    status: review.status ?? "scheduled",
    buddy: {
      ...review.buddy,
      avatarUrl: review.buddy.avatarUrl ?? undefined,
    },
  })),
);

// Fetch past reviews for buddy (reactive based on selectedBuddyId)
const { data: pastData, refresh: refreshPast } = useApi<ReviewsResponse>(
  (() =>
    selectedBuddyId.value
      ? `/reviews/past?userId=${selectedBuddyId.value}`
      : null) as () => string,
);
// Mapped onto the shape PastReviewCard expects (nullable fields → undefined).
const pastReviews = computed(() =>
  (pastData.value?.reviews || []).map((review) => ({
    ...review,
    name: review.name ?? "",
    completedDate: review.completedDate ?? undefined,
    completionNotes: review.completionNotes ?? undefined,
  })),
);

// Refresh when buddy changes
const { set: announce } = useAnnouncer();
watch(selectedBuddyId, async () => {
  await Promise.all([refreshUpcoming(), refreshPast()]);
  // Reviews reload silently — announce for screen readers.
  const name = selectedBuddy.value?.name;
  if (name) announce(`Showing reviews for ${name}`, "polite");
});

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Modal state for review details
const showReviewModal = ref(false);
const selectedReview = ref<any>(null);
const checkinNotes = ref<string>("");

// Edit review modal state
const isEditModalOpen = ref(false);
const isEditing = ref(false);
const editingReview = reactive({
  id: "",
  scheduledDate: "",
  scheduledTime: "09:00",
  includeTime: false,
  name: "",
});

const openReviewModal = async (review: any) => {
  selectedReview.value = review;
  showReviewModal.value = true;
  // Initialize notes for the modal
  checkinNotes.value = "";
};

// Open edit modal
const openEditModal = (review: any) => {
  // Update reactive properties individually
  editingReview.id = review.id;

  if (review.scheduledDate) {
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();
    const utcDate = new Date(review.scheduledDate);

    // Check if this is midnight UTC (all day event)
    const utcHours = utcDate.getUTCHours();
    const utcMinutes = utcDate.getUTCMinutes();
    const isAllDay = utcHours === 0 && utcMinutes === 0;

    // Convert from UTC to user's configured timezone using date-fns-tz
    // Extract date in user's timezone
    editingReview.scheduledDate = formatTz(utcDate, "yyyy-MM-dd", {
      timeZone: userTz,
    });
    // Extract time in user's timezone
    editingReview.scheduledTime = formatTz(utcDate, "HH:mm", {
      timeZone: userTz,
    });

    editingReview.includeTime = !isAllDay;
  } else {
    editingReview.scheduledDate = "";
    editingReview.scheduledTime = "09:00";
    editingReview.includeTime = false;
  }

  editingReview.name = review.name || "";
  isEditModalOpen.value = true;
};

// Update review
const updateReview = async () => {
  if (!editingReview.id || !editingReview.scheduledDate) {
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
    const dateTimeString = editingReview.includeTime
      ? `${editingReview.scheduledDate}T${editingReview.scheduledTime}`
      : `${editingReview.scheduledDate}T00:00`;

    // Convert from user's configured timezone to UTC
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();

    // Convert the datetime from user's timezone to UTC
    const utcDate = fromZonedTime(dateTimeString, userTz);
    const utcDateString = utcDate.toISOString();

    await $api(`/reviews/${editingReview.id}`, {
      method: "PATCH",
      body: {
        scheduledDate: utcDateString,
        name: editingReview.name,
      },
    });

    await Promise.all([refreshUpcoming(), refreshPast()]);
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

// Create review modal state
const isCreateModalOpen = ref(false);
const scheduledDate = ref<string>("");
const scheduledTime = ref<string>("09:00");
const includeTime = ref(false);
const reviewName = ref<string>("");
const isCreating = ref(false);
const isStartingNow = ref(false);

// Review template picker state
const reviewTemplates = ref<
  Array<{ id: string; name: string; isDefault: boolean }>
>([]);
const selectedTemplateId = ref<string | null>(null);

const templateSelectItems = computed(() =>
  reviewTemplates.value.map((t) => ({ label: t.name, value: t.id })),
);

const fetchReviewTemplates = async () => {
  try {
    const data = await $api("/admin/review-templates");
    const templates = data.templates ?? [];
    reviewTemplates.value = templates;
    const def = templates.find((t: { isDefault: boolean }) => t.isDefault);
    selectedTemplateId.value = def?.id ?? templates[0]?.id ?? null;
  } catch {
    // Non-admin buddies cannot list templates; the server will snapshot the
    // workspace default automatically, so leave the dropdown hidden.
    reviewTemplates.value = [];
    selectedTemplateId.value = null;
  }
};

onMounted(fetchReviewTemplates);

// Helper to get the next hour as "HH:mm"
const getNextHourTime = () => {
  const now = new Date();
  const nextHour = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
  );
  return format(nextHour, "HH:mm");
};

// Check if a date string is today
const todayString = computed(() => new Date().toISOString().split("T")[0]);
const isCreateDateToday = computed(
  () => scheduledDate.value === todayString.value,
);
const isEditDateToday = computed(
  () => editingReview.scheduledDate === todayString.value,
);

// When create date changes to today, auto-enable time picker with next hour
watch(scheduledDate, (newDate) => {
  if (newDate) {
    const date = new Date(newDate);
    reviewName.value = format(date, "MMMM yyyy");

    if (newDate === todayString.value) {
      includeTime.value = true;
      scheduledTime.value = getNextHourTime();
    }
  }
});

// When edit date changes to today, auto-enable time picker with next hour
watch(
  () => editingReview.scheduledDate,
  (newDate) => {
    if (newDate === todayString.value) {
      editingReview.includeTime = true;
      editingReview.scheduledTime = getNextHourTime();
    }
  },
);

// Reset create review form
const resetForm = () => {
  scheduledDate.value = "";
  scheduledTime.value = "09:00";
  includeTime.value = false;
  reviewName.value = "";
  selectedTemplateId.value =
    reviewTemplates.value.find((t) => t.isDefault)?.id ??
    reviewTemplates.value[0]?.id ??
    null;
};

// Create review for selected buddy
const createReview = async () => {
  if (!selectedBuddyId.value || !scheduledDate.value) {
    toast.add({
      title: "Missing required fields",
      description: "Please select a scheduled date",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  isCreating.value = true;

  try {
    // Combine date and time if time is included, otherwise use midnight for "all day"
    const dateTimeString = includeTime.value
      ? `${scheduledDate.value}T${scheduledTime.value}`
      : `${scheduledDate.value}T00:00`;

    // Convert from user's configured timezone to UTC
    const { getUserTimezone } = useUserTimezone();
    const userTz = getUserTimezone();

    // Convert the datetime from user's timezone to UTC
    const utcDate = fromZonedTime(dateTimeString, userTz);
    const utcDateString = utcDate.toISOString();

    await $api("/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: utcDateString,
        name: reviewName.value,
        templateId: selectedTemplateId.value,
      },
    });

    await Promise.all([refreshUpcoming(), refreshPast()]);
    isCreateModalOpen.value = false;
    resetForm();

    toast.add({
      title: "Review created",
      description: "The review has been scheduled successfully",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to create review:", error);
    toast.add({
      title: "Failed to create review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isCreating.value = false;
  }
};

// Start review immediately and navigate to detail page
const startReviewNow = async () => {
  if (!selectedBuddyId.value) return;

  isStartingNow.value = true;

  try {
    const now = new Date();
    const reviewName = format(now, "MMMM yyyy");

    const response = await $api("/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: now.toISOString(),
        name: reviewName,
      },
    });

    await navigateTo(`/reviews/${(response as any).review.id}`);
  } catch (error: any) {
    console.error("Failed to start review:", error);
    toast.add({
      title: "Failed to start review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isStartingNow.value = false;
  }
};

// Complete review
const completeReview = async (reviewId: string) => {
  try {
    await $api(`/reviews/${reviewId}/complete`, {
      method: "PATCH",
      body: { completionNotes: "" },
    });
    await Promise.all([refreshUpcoming(), refreshPast()]);
    showReviewModal.value = false;
    toast.add({
      title: "Review completed",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to complete review:", error);
    toast.add({
      title: "Failed to complete review",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

// Re-open review
const reopenReview = async (reviewId: string) => {
  try {
    await $api(`/reviews/${reviewId}/reopen`, {
      method: "PATCH",
    });
    await Promise.all([refreshUpcoming(), refreshPast()]);
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
  }
};

// Delete review
const deleteReview = async (reviewId: string) => {
  try {
    await $api(`/reviews/${reviewId}`, {
      method: "DELETE",
    });
    await Promise.all([refreshUpcoming(), refreshPast()]);
    toast.add({
      title: "Review deleted",
      description: "The review has been deleted successfully",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to delete review:", error);
    toast.add({
      title: "Failed to delete review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

// Capitalize first letter helper
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// Get dropdown actions for a review
const getReviewActions = (review: any) => {
  const actions: any[] = [
    {
      label: "Edit",
      icon: "i-heroicons-pencil-square",
      onSelect: () => openEditModal(review),
    },
    {
      label: "Add to Calendar",
      icon: "i-heroicons-calendar",
      onSelect: () => downloadICalFile(review),
    },
  ];

  if (review.status === "scheduled") {
    actions.push({
      label: "Mark Complete",
      icon: "i-heroicons-check-circle",
      onSelect: () => completeReview(review.id),
    });
  }

  if (review.status === "completed") {
    actions.push({
      label: "Re-open",
      icon: "i-heroicons-arrow-path",
      onSelect: () => reopenReview(review.id),
    });
  }

  return [
    actions,
    [
      {
        label: "Delete",
        icon: "i-heroicons-trash",
        color: "error" as const,
        onSelect: () => deleteReview(review.id),
      },
    ],
  ];
};
</script>

<template>
  <UDashboardPanel id="buddy-reviews">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header -->
        <div class="mb-6">
          <h1
            class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            Buddy Reviews
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Track and manage your buddy's review schedule
          </p>
        </div>

        <!-- Buddy Selector and Create Button -->
        <div class="mb-6 flex items-end justify-between gap-4">
          <div class="flex-1">
            <BuddySelector
              :buddy-id="selectedBuddyId || undefined"
              @buddy-selected="handleBuddySelected"
            />
          </div>
          <div v-if="selectedBuddyId" class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-play"
              color="primary"
              :loading="isStartingNow"
              @click="startReviewNow"
            >
              Start Now
            </UButton>
            <UButton
              icon="i-heroicons-plus"
              color="neutral"
              @click="isCreateModalOpen = true"
            >
              Schedule Review
            </UButton>
          </div>
        </div>

        <!-- Tabbed Reviews Interface -->
        <div v-if="selectedBuddyId && selectedBuddy">
          <!-- Empty state when buddy has no reviews at all -->
          <EmptyState
            v-if="upcomingReviews.length === 0 && pastReviews.length === 0"
            icon="i-heroicons-calendar-days"
            heading="No reviews yet"
            :description="`${selectedBuddy.name} doesn't have any scheduled reviews yet.`"
            variant="primary"
          >
            <template #actions>
              <div class="flex items-center justify-center gap-2">
                <UButton
                  icon="i-heroicons-play"
                  color="primary"
                  size="lg"
                  :loading="isStartingNow"
                  @click="startReviewNow"
                >
                  Start Now
                </UButton>
                <UButton
                  icon="i-heroicons-plus"
                  color="neutral"
                  size="lg"
                  @click="isCreateModalOpen = true"
                >
                  Schedule Review
                </UButton>
              </div>
            </template>
          </EmptyState>

          <div v-else class="space-y-12">
            <!-- Upcoming Review Section -->
            <section>
              <h2
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
              >
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="text-primary-500"
                />
                Upcoming Reviews
                <UBadge
                  v-if="upcomingReviews.length > 0"
                  :label="upcomingReviews.length.toString()"
                  color="primary"
                />
              </h2>

              <div v-if="upcomingReviews.length > 0" class="space-y-4">
                <ReviewsUpcomingReviewCard
                  v-for="(review, index) in upcomingReviews"
                  :key="review.id"
                  :review="review"
                  :index="index"
                >
                  <!-- No metadata slot needed for buddy page -->

                  <template #actions="{ review }">
                    <div class="flex items-center gap-2">
                      <UButton :to="`/reviews/${review.id}`" variant="soft">
                        View Details
                      </UButton>
                      <UDropdownMenu :items="getReviewActions(review)">
                        <UButton
                          icon="i-heroicons-ellipsis-vertical"
                          variant="ghost"
                          color="neutral"
                        />
                      </UDropdownMenu>
                    </div>
                  </template>
                </ReviewsUpcomingReviewCard>
              </div>

              <EmptyState
                v-else
                icon="i-heroicons-calendar-days"
                icon-color="text-gray-400"
                icon-bg-color="bg-gray-100 dark:bg-gray-800"
                heading="No upcoming review"
                :description="`${selectedBuddy?.name} has no scheduled reviews coming up`"
                variant="secondary"
              >
                <template #actions>
                  <div class="flex items-center justify-center gap-2">
                    <UButton
                      icon="i-heroicons-play"
                      color="primary"
                      :loading="isStartingNow"
                      @click="startReviewNow"
                    >
                      Start Now
                    </UButton>
                    <UButton
                      icon="i-heroicons-plus"
                      color="neutral"
                      @click="isCreateModalOpen = true"
                    >
                      Schedule Review
                    </UButton>
                  </div>
                </template>
              </EmptyState>
            </section>

            <!-- Past Reviews Section -->
            <section>
              <h2
                class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
              >
                <UIcon name="i-heroicons-archive-box" class="text-gray-500" />
                Past Reviews
              </h2>

              <div
                v-if="pastReviews.length > 0"
                class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <ReviewsPastReviewCard
                  v-for="review in pastReviews"
                  :key="review.id"
                  :review="review"
                >
                  <template #metadata="{ review }">
                    <UIcon name="i-heroicons-user" class="w-4 h-4" />
                    <span>{{ review.user?.name || "Unknown" }}</span>
                  </template>
                </ReviewsPastReviewCard>
              </div>

              <EmptyState
                v-else
                icon="i-heroicons-archive-box"
                icon-color="text-gray-400"
                icon-bg-color="bg-gray-100 dark:bg-gray-800"
                heading="No past reviews"
                :description="`${selectedBuddy?.name} has no completed reviews yet`"
                variant="secondary"
              />
            </section>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Review Details Modal -->
  <UModal
    v-model:open="showReviewModal"
    :title="`Review: ${selectedReview?.name}`"
    size="xl"
  >
    <template #body>
      <div v-if="selectedReview" class="space-y-6">
        <!-- Review Details -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Scheduled Date
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatDate(selectedReview.scheduledDate) }}
            </div>
          </div>

          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Status</div>
            <div>
              <UBadge
                :label="selectedReview.status"
                :color="getStatusColor(selectedReview.status)"
              />
            </div>
          </div>
        </div>

        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Feedback Items
          </div>
          <div class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ selectedReview.feedbackCount || 0 }} items
          </div>
        </div>

        <!-- Check-ins Section -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            💬 Check-ins
          </h3>
          <div
            v-if="selectedReview.checkins && selectedReview.checkins.length > 0"
            class="space-y-3"
          >
            <div
              v-for="checkin in selectedReview.checkins"
              :key="checkin.id"
              class="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{
                      format(new Date(checkin.createdAt), "MMM d, yyyy h:mm a")
                    }}
                  </p>
                  <p class="text-xs text-gray-500">
                    by {{ checkin.buddy.name }}
                  </p>
                </div>
              </div>
              <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {{ checkin.notes }}
              </p>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-gray-400">
            No check-ins recorded for this review.
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton variant="ghost" @click="showReviewModal = false">
          Close
        </UButton>
        <UButton
          v-if="selectedReview?.status === 'scheduled'"
          color="success"
          @click="completeReview(selectedReview.id)"
        >
          Complete Review
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Create Review Modal -->
  <UModal
    v-model:open="isCreateModalOpen"
    :title="`Create Review for ${selectedBuddy?.name || 'Buddy'}`"
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
            v-model="scheduledDate"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            class="w-auto"
          />
        </div>

        <!-- Include Time Checkbox (hidden when date is today) -->
        <div v-if="!isCreateDateToday" class="flex items-center gap-2">
          <UCheckbox v-model="includeTime" />
          <label
            class="text-sm font-medium cursor-pointer"
            @click="includeTime = !includeTime"
          >
            Schedule at specific time
          </label>
        </div>

        <!-- Time Picker (conditional, always shown for today) -->
        <div v-if="includeTime">
          <label class="block text-sm font-medium mb-2"> Time </label>
          <UInput v-model="scheduledTime" type="time" class="w-auto" />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review will be scheduled at {{ scheduledTime }}
          </p>
        </div>

        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          Review will be shown as an all-day event
        </div>

        <!-- Review Name -->
        <div>
          <label class="block text-sm font-medium mb-2"> Review Name </label>
          <UInput
            v-model="reviewName"
            placeholder="e.g., January 2026"
            size="lg"
            class="w-full"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto-generated from date if left empty
          </p>
        </div>

        <!-- Review Template -->
        <div v-if="reviewTemplates.length">
          <label class="block text-sm font-medium mb-2">
            Review template
          </label>
          <USelect
            v-model="selectedTemplateId"
            :items="templateSelectItems"
            placeholder="Choose a template"
            class="w-full"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="isCreating"
        @click="
          isCreateModalOpen = false;
          resetForm();
        "
      >
        Cancel
      </UButton>
      <UButton
        :loading="isCreating"
        :disabled="!scheduledDate"
        @click="createReview"
      >
        Create Review
      </UButton>
    </template>
  </UModal>

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
            v-model="editingReview.scheduledDate"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            class="w-auto"
          />
        </div>

        <!-- Include Time Checkbox (hidden when date is today) -->
        <div v-if="!isEditDateToday" class="flex items-center gap-2">
          <UCheckbox v-model="editingReview.includeTime" />
          <label
            class="text-sm font-medium cursor-pointer"
            @click="editingReview.includeTime = !editingReview.includeTime"
          >
            Schedule at specific time
          </label>
        </div>

        <!-- Time Picker (conditional, always shown for today) -->
        <div v-if="editingReview.includeTime">
          <label class="block text-sm font-medium mb-2"> Time </label>
          <UInput
            v-model="editingReview.scheduledTime"
            type="time"
            class="w-auto"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Review will be scheduled at {{ editingReview.scheduledTime }}
          </p>
        </div>

        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          Review will be shown as an all-day event
        </div>

        <!-- Review Name -->
        <div>
          <label class="block text-sm font-medium mb-2"> Review Name </label>
          <UInput
            v-model="editingReview.name"
            placeholder="e.g., January 2026"
            size="lg"
            class="w-full"
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
        :disabled="!editingReview.scheduledDate"
        @click="updateReview"
      >
        Save Changes
      </UButton>
    </template>
  </UModal>
</template>
