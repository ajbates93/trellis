<script setup lang="ts">
import { format } from "date-fns";
import { differenceInDays } from "date-fns";

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

const { buddies, pending } = useBuddies();
const toast = useToast();

// Initialize selected buddy
const selectedBuddyId = ref<string | null>(null);

// If user has exactly 1 buddy, auto-select them
watch(
  () => pending.value,
  (isPending) => {
    if (!isPending && selectedBuddyId.value === null && buddies.value.length === 1) {
      selectedBuddyId.value = buddies.value[0].id;
    }
  },
  { immediate: true }
);

// Fetch upcoming reviews for buddy (reactive based on selectedBuddyId)
const { data: upcomingData, refresh: refreshUpcoming } = useFetch(
  () => selectedBuddyId.value ? `/api/reviews/upcoming?userId=${selectedBuddyId.value}` : null
);
const upcomingReviews = computed(() => upcomingData.value?.reviews || []);

// Fetch past reviews for buddy (reactive based on selectedBuddyId)
const { data: pastData, refresh: refreshPast } = useFetch(
  () => selectedBuddyId.value ? `/api/reviews/past?userId=${selectedBuddyId.value}` : null
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

// Get status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case "scheduled":
      return "amber";
    case "completed":
      return "green";
    case "rescheduled":
      return "blue";
    default:
      return "gray";
  }
};

// Modal state for review details
const showReviewModal = ref(false);
const selectedReview = ref<any>(null);

const openReviewModal = (review: any) => {
  selectedReview.value = review;
  showReviewModal.value = true;
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

// Column definitions
const upcomingColumns = [
  {
    id: "date",
    accessorKey: "scheduledDate",
    header: "Scheduled Date",
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Review Name",
  },
  {
    id: "feedback",
    header: "Feedback Items",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "actions",
    header: "",
  },
];

const pastColumns = [
  {
    id: "date",
    accessorKey: "completedDate",
    header: "Completed Date",
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Review Name",
  },
  {
    id: "feedback",
    header: "Feedback Items",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
  },
];
</script>

<template>
  <UDashboardPanel id="buddy-reviews">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Buddy Reviews
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Track and manage your buddy's review schedule
          </p>
        </div>

        <!-- Buddy Selector -->
        <div class="mb-6">
          <BuddySelector
            :buddy-id="selectedBuddyId || undefined"
            @buddy-selected="handleBuddySelected"
          />
        </div>

        <!-- Reviews Content -->
        <div v-if="selectedBuddyId && buddyInfo" class="space-y-8">
          <!-- Upcoming Reviews Section -->
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Reviews
            </h2>
            <UCard>
              <div
                v-if="upcomingReviews.length === 0"
                class="text-center py-12"
              >
                <UIcon
                  name="i-heroicons-calendar"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  No upcoming reviews
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ buddyInfo.name }} has no scheduled reviews coming up
                </p>
              </div>

              <UTable
                v-else
                :columns="upcomingColumns"
                :data="upcomingReviews"
              >
                <template #date-cell="{ row }">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ formatDate(row.original.scheduledDate) }}
                    </div>
                    <div
                      v-if="getDaysUntilReview(row.original.scheduledDate) !== null"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      {{
                        getDaysUntilReview(row.original.scheduledDate) === 0
                          ? "Today"
                          : `${getDaysUntilReview(row.original.scheduledDate)} days away`
                      }}
                    </div>
                  </div>
                </template>

                <template #feedback-cell="{ row }">
                  <UBadge
                    :label="`${row.original.feedbackCount || 0} items`"
                    color="blue"
                    variant="subtle"
                  />
                </template>

                <template #status-cell="{ row }">
                  <UBadge
                    :label="row.original.status"
                    :color="getStatusColor(row.original.status)"
                    size="xs"
                  />
                </template>

                <template #actions-cell="{ row }">
                  <div class="flex items-center gap-2">
                    <UButton
                      size="xs"
                      variant="ghost"
                      @click="openReviewModal(row.original)"
                    >
                      View
                    </UButton>
                    <UButton
                      v-if="row.original.status === 'scheduled'"
                      size="xs"
                      variant="ghost"
                      color="success"
                      @click="completeReview(row.original.id)"
                    >
                      Complete
                    </UButton>
                  </div>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- Past Reviews Section -->
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Past Reviews
            </h2>
            <UCard>
              <div
                v-if="pastReviews.length === 0"
                class="text-center py-12"
              >
                <UIcon
                  name="i-heroicons-check-circle"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  No past reviews
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ buddyInfo.name }} hasn't had any completed reviews yet
                </p>
              </div>

              <UTable
                v-else
                :columns="pastColumns"
                :data="pastReviews"
              >
                <template #date-cell="{ row }">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(row.original.completedDate) }}
                  </span>
                </template>

                <template #feedback-cell="{ row }">
                  <UBadge
                    :label="`${row.original.feedbackCount || 0} items`"
                    color="blue"
                    variant="subtle"
                  />
                </template>

                <template #status-cell="{ row }">
                  <UBadge
                    :label="row.original.status"
                    :color="getStatusColor(row.original.status)"
                    size="xs"
                  />
                </template>
              </UTable>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Review Details Modal -->
  <UModal v-model:open="showReviewModal" :title="`Review: ${selectedReview?.name}`">
    <template #body>
      <div v-if="selectedReview" class="space-y-4">
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Scheduled Date</div>
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

        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Feedback Items</div>
          <div class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ selectedReview.feedbackCount || 0 }} items
          </div>
        </div>

        <div v-if="selectedReview.notes">
          <div class="text-sm text-gray-500 dark:text-gray-400">Notes</div>
          <div class="text-gray-900 dark:text-gray-100">{{ selectedReview.notes }}</div>
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
</template>
