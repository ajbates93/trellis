<script setup lang="ts">
import { format, differenceInDays  } from "date-fns";
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

const toast = useToast();
const { selectedBuddyId } = useSelectedBuddy();
const { buddies, getBuddyById } = useBuddies();

// Get selected buddy info
const selectedBuddy = computed(() => {
  if (!selectedBuddyId.value) return null;
  return getBuddyById(selectedBuddyId.value);
});

// Fetch upcoming reviews for buddy (reactive based on selectedBuddyId)
const { data: upcomingData, refresh: refreshUpcoming } = useFetch(() =>
  selectedBuddyId.value
    ? `/api/reviews/upcoming?userId=${selectedBuddyId.value}`
    : null,
);
const upcomingReviews = computed(() => upcomingData.value?.reviews || []);

// Fetch past reviews for buddy (reactive based on selectedBuddyId)
const { data: pastData, refresh: refreshPast } = useFetch(() =>
  selectedBuddyId.value
    ? `/api/reviews/past?userId=${selectedBuddyId.value}`
    : null,
);
const pastReviews = computed(() => pastData.value?.reviews || []);

// Get buddy info from either upcoming or past reviews
const buddyInfo = computed(() => {
  if (upcomingReviews.value.length > 0) {
    return upcomingReviews.value[0].user;
  }
  if (pastReviews.value.length > 0) {
    return pastReviews.value[0].user;
  }
  return null;
});

// Refresh when buddy changes
watch(selectedBuddyId, async () => {
  await Promise.all([refreshUpcoming(), refreshPast()]);
});

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Tab state
const activeTab = ref('upcoming');

// Tab items
const tabItems = computed<TabsItem[]>(() => [
  {
    label: 'Upcoming',
    icon: 'i-heroicons-calendar-days',
    badge: upcomingReviews.value.length > 0 ? upcomingReviews.value.length : undefined,
    value: 'upcoming',
    slot: 'upcoming',
  },
  {
    label: 'Past',
    icon: 'i-heroicons-archive-box',
    badge: pastReviews.value.length > 0 ? pastReviews.value.length : undefined,
    value: 'past',
    slot: 'past',
  },
]);

// Format date helper
const formatDate = (date: string | Date | null) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
};

// Get days until review
const getDaysUntilReview = (scheduledDate: string) => {
  try {
    return differenceInDays(new Date(scheduledDate), new Date());
  } catch {
    return null;
  }
};

// Get status badge color - using subtle colors to reduce visual noise
const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled":
      return "neutral";
    case "completed":
      return "success";
    case "rescheduled":
      return "warning";
    default:
      return "neutral";
  }
};

// Modal state for review details
const showReviewModal = ref(false);
const selectedReview = ref<any>(null);
const checkinNotes = ref<string>("");

// Edit review modal state
const isEditModalOpen = ref(false);
const editReviewId = ref<string>("");
const editScheduledDate = ref<string>("");
const editReviewName = ref<string>("");
const editNotes = ref<string>("");
const isEditing = ref(false);

const openReviewModal = async (review: any) => {
  selectedReview.value = review;
  showReviewModal.value = true;
  // Initialize notes for the modal
  checkinNotes.value = "";
};

// Open edit modal
const openEditModal = (review: any) => {
  editReviewId.value = review.id;
  editScheduledDate.value = review.scheduledDate;
  editReviewName.value = review.name || "";
  editNotes.value = review.notes || "";
  isEditModalOpen.value = true;
};

// Update review
const updateReview = async () => {
  if (!editReviewId.value || !editScheduledDate.value) {
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
    await $fetch(`/api/reviews/${editReviewId.value}`, {
      method: "PATCH",
      body: {
        scheduledDate: editScheduledDate.value,
        name: editReviewName.value,
        notes: editNotes.value,
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
const reviewName = ref<string>("");
const notes = ref<string>("");
const isCreating = ref(false);

// Watch scheduled date to auto-generate review name
watch(scheduledDate, (newDate) => {
  if (newDate) {
    const date = new Date(newDate);
    reviewName.value = format(date, "MMMM yyyy");
  }
});

// Reset create review form
const resetForm = () => {
  scheduledDate.value = "";
  reviewName.value = "";
  notes.value = "";
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
    await $fetch("/api/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: scheduledDate.value,
        name: reviewName.value,
        notes: notes.value,
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

// Complete review
const completeReview = async (reviewId: string) => {
  try {
    await $fetch(`/api/reviews/${reviewId}/complete`, {
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

// Column definitions - simplified structure with width hints
const upcomingColumns = [
  {
    id: "review",
    header: "Review",
  },
  {
    id: "feedback",
    header: "Feedback",
    size: 100,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    size: 120,
  },
  {
    id: "actions",
    header: "",
    size: 120,
  },
];

const pastColumns = [
  {
    id: "review",
    header: "Review",
  },
  {
    id: "feedback",
    header: "Feedback",
    size: 100,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    size: 120,
  },
  {
    id: "actions",
    header: "",
    size: 120,
  },
];

// Capitalize first letter helper
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// Get dropdown actions for a review
const getReviewActions = (review: any) => [
  [
    {
      label: 'Edit',
      icon: 'i-heroicons-pencil-square',
      onSelect: () => openEditModal(review),
    },
    {
      label: 'Mark Complete',
      icon: 'i-heroicons-check-circle',
      onSelect: () => completeReview(review.id),
    },
  ],
];
</script>

<template>
  <UDashboardPanel id="buddy-reviews">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Page header -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
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
          <UButton
            v-if="selectedBuddyId"
            icon="i-heroicons-plus"
            @click="isCreateModalOpen = true"
          >
            Create Review
          </UButton>
        </div>

        <!-- Tabbed Reviews Interface -->
        <div v-if="selectedBuddyId && buddyInfo">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            variant="pill"
            color="neutral"
            size="lg"
            class="w-full"
            :ui="{
              list: 'bg-gray-200 dark:bg-gray-800 rounded-xl p-1',
              trigger: 'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
              indicator: 'bg-white dark:bg-gray-900 shadow-sm',
            }"
          >
            <!-- Upcoming Reviews Tab -->
            <template #upcoming>
              <div class="pt-6">
                <UCard>
                  <div
                    v-if="upcomingReviews.length === 0"
                    class="text-center py-12"
                  >
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <UIcon name="i-heroicons-calendar-days" class="w-8 h-8 text-primary" />
                    </div>
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      No upcoming reviews
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ buddyInfo.name }} has no scheduled reviews coming up
                    </p>
                  </div>

                  <UTable v-else :columns="upcomingColumns" :data="upcomingReviews">
                    <template #review-cell="{ row }">
                      <div>
                        <div class="font-medium text-gray-900 dark:text-white">
                          {{ row.original.name }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ formatDate(row.original.scheduledDate) }}
                          <span v-if="getDaysUntilReview(row.original.scheduledDate) !== null">
                            ·
                            {{
                              getDaysUntilReview(row.original.scheduledDate) === 0
                                ? "Today"
                                : `${getDaysUntilReview(row.original.scheduledDate)} days`
                            }}
                          </span>
                        </div>
                      </div>
                    </template>

                    <template #feedback-cell="{ row }">
                      <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4" />
                        <span>{{ row.original.feedbackCount || 0 }}</span>
                      </div>
                    </template>

                    <template #status-cell="{ row }">
                      <UBadge
                        :label="capitalize(row.original.status)"
                        :color="getStatusColor(row.original.status)"
                        variant="subtle"
                      />
                    </template>

                    <template #actions-cell="{ row }">
                      <div class="flex items-center gap-2 justify-end">
                        <UButton
                          :to="`/reviews/${row.original.id}`"
                          variant="soft"
                        >
                          View
                        </UButton>
                        <UDropdownMenu
                          v-if="row.original.status === 'scheduled'"
                          :items="getReviewActions(row.original)"
                        >
                          <UButton
                            icon="i-heroicons-ellipsis-vertical"
                            variant="ghost"
                            color="neutral"
                          />
                        </UDropdownMenu>
                      </div>
                    </template>
                  </UTable>
                </UCard>
              </div>
            </template>

            <!-- Past Reviews Tab -->
            <template #past>
              <div class="pt-6">
                <UCard>
                  <div v-if="pastReviews.length === 0" class="text-center py-12">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <UIcon name="i-heroicons-archive-box" class="w-8 h-8 text-gray-400" />
                    </div>
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      No past reviews
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ buddyInfo.name }} has no reviews scheduled in the past
                    </p>
                  </div>

                  <UTable v-else :columns="pastColumns" :data="pastReviews">
                    <template #review-cell="{ row }">
                      <div>
                        <div class="font-medium text-gray-900 dark:text-white">
                          {{ row.original.name }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ formatDate(row.original.scheduledDate) }}
                          <span v-if="row.original.completedDate">
                            · Completed {{ formatDate(row.original.completedDate) }}
                          </span>
                        </div>
                      </div>
                    </template>

                    <template #feedback-cell="{ row }">
                      <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4" />
                        <span>{{ row.original.feedbackCount || 0 }}</span>
                      </div>
                    </template>

                    <template #status-cell="{ row }">
                      <UBadge
                        :label="capitalize(row.original.status)"
                        :color="getStatusColor(row.original.status)"
                        variant="subtle"
                      />
                    </template>

                    <template #actions-cell="{ row }">
                      <div class="flex items-center justify-end">
                        <UButton
                          :to="`/reviews/${row.original.id}`"
                          variant="soft"
                        >
                          View
                        </UButton>
                      </div>
                    </template>
                  </UTable>
                </UCard>
              </div>
            </template>
          </UTabs>
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

        <div v-if="selectedReview.notes">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Pre-Review Notes
          </div>
          <div class="text-gray-900 dark:text-gray-100">
            {{ selectedReview.notes }}
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

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <UTextarea
            v-model="notes"
            placeholder="Add any notes about this review..."
            :rows="4"
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
            v-model="editScheduledDate"
            type="date"
            :min="new Date().toISOString().split('T')[0]"
            class="w-auto"
          />
        </div>

        <!-- Review Name -->
        <div>
          <label class="block text-sm font-medium mb-2"> Review Name </label>
          <UInput
            v-model="editReviewName"
            placeholder="e.g., January 2026"
            size="lg"
            class="w-full"
          />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <UTextarea
            v-model="editNotes"
            placeholder="Add any notes about this review..."
            :rows="4"
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
        :disabled="!editScheduledDate"
        @click="updateReview"
      >
        Save Changes
      </UButton>
    </template>
  </UModal>
</template>
