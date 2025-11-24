<script setup lang="ts">
import { format } from "date-fns";

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

const toast = useToast();
const { buddies, hasBuddies } = useBuddies();
const { selectedBuddyId } = useSelectedBuddy();

// Tab state
const selectedTab = ref("received");

const tabs = [
  { label: "Received", value: "received" },
  { label: "Incoming", value: "incoming" },
];

// Fetch buddy received feedback (reactive based on selectedBuddyId)
const { data: buddyReceivedData, refresh: refreshBuddyReceived } = useFetch(
  () =>
    selectedBuddyId.value
      ? `/api/feedback/buddy-received?buddyId=${selectedBuddyId.value}`
      : null,
);
const buddyReceivedFeedback = computed(
  () => buddyReceivedData.value?.feedback || [],
);


// Fetch incoming (unpublished) feedback for all buddies
const { data: incomingData, refresh: refreshIncoming } = useFetch(
  "/api/feedback/for-buddy",
);
const incomingFeedback = computed(() => {
  const assignments = incomingData.value?.buddyAssignments || [];
  return assignments.flatMap((assignment: any) => assignment.feedback || []);
});

// Refresh Received when buddy changes, but Incoming stays the same
watch(selectedBuddyId, async () => {
  await refreshBuddyReceived();
});

// Get unread count refresh function
const { refreshUnreadCount } = useUnreadCount();

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Publish single feedback
const publishFeedback = async (feedbackId: string) => {
  try {
    await $fetch(`/api/feedback/${feedbackId}/publish`, { method: "PATCH" });
    await refreshIncoming();
    toast.add({
      title: "Feedback published",
      description: "The feedback is now visible to the recipient.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to publish feedback:", error);
    toast.add({
      title: "Failed to publish feedback",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    throw error;
  }
};

// Publish batch feedback
const publishBatch = async (feedbackIds: string[]) => {
  try {
    await $fetch("/api/feedback/publish-batch", {
      method: "POST",
      body: { feedbackIds },
    });
    await refreshIncoming();
    toast.add({
      title: `Published ${feedbackIds.length} feedback items`,
      description: "All feedback is now visible to recipients.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to publish batch:", error);
    toast.add({
      title: "Failed to publish feedback",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    throw error;
  }
};

// Publish all incoming feedback
const publishAllIncoming = async () => {
  if (incomingFeedback.value.length === 0) return;
  const feedbackIds = incomingFeedback.value.map((f) => f.id);
  return await publishBatch(feedbackIds);
};

// Reassign feedback to a different review
const reassignFeedback = async (
  feedbackId: string,
  reviewScheduleId: string | null,
) => {
  try {
    await $fetch(`/api/feedback/${feedbackId}/assign-review`, {
      method: "PATCH",
      body: { reviewScheduleId },
    });
    await refreshIncoming();
    toast.add({
      title: "Feedback reassigned",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to reassign feedback:", error);
    toast.add({
      title: "Failed to reassign",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
};

// Fetch reviews for a user (for reassignment dropdown)
const userReviews = ref<Map<string, any[]>>(new Map());
const fetchUserReviews = async (userId: string) => {
  if (userReviews.value.has(userId)) return;

  try {
    const data = await $fetch(`/api/reviews/upcoming?userId=${userId}`);
    const data2 = await $fetch(`/api/reviews/past?userId=${userId}`);
    const allReviews = [...(data.reviews || []), ...(data2.reviews || [])].map(
      (r: any) => ({
        value: r.id,
        label: r.name,
      }),
    );
    userReviews.value.set(userId, allReviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
  }
};

// Format date helper
const formatDate = (date: string | Date | null) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
};

// Modal state
const isModalOpen = ref(false);
const selectedFeedback = ref<any>(null);

// Open modal with selected feedback
const openFeedbackModal = (feedback: any) => {
  selectedFeedback.value = feedback;
  isModalOpen.value = true;
};

// Column definitions
const receivedColumns = [
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
  { id: "date", accessorKey: "publishedAt", header: "Date" },
  { id: "review", accessorKey: "review", header: "Review" },
];

const incomingColumns = [
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
  { id: "review", accessorKey: "review", header: "Review" },
  {
    id: "actions",
    header: "Actions",
    meta: {
      class: {
        td: "min-w-[280px]",
      },
    },
  },
];
</script>

<template>
  <UDashboardPanel id="buddy-feedback">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Buddy Feedback
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your buddy's feedback
          </p>
        </div>

        <!-- Buddy Selector -->
        <div v-if="hasBuddies" class="mb-6">
          <BuddySelector
            :buddy-id="selectedBuddyId || undefined"
            @buddy-selected="handleBuddySelected"
          />
        </div>

        <!-- Tabs -->
        <UTabs
          v-if="selectedBuddyId"
          v-model="selectedTab"
          :items="tabs"
          class="mb-6"
        />

        <!-- Tab Content -->
        <div v-if="selectedBuddyId" class="mt-6">
          <!-- Received Tab -->
          <div v-if="selectedTab === 'received'">
            <UCard>
              <div
                v-if="buddyReceivedFeedback.length === 0"
                class="text-center py-12"
              >
                <UIcon
                  name="i-heroicons-inbox"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  No feedback received
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This buddy hasn't received any published feedback yet
                </p>
              </div>

              <UTable
                v-else
                :columns="receivedColumns"
                :data="buddyReceivedFeedback"
              >
                <template #from-cell="{ row }">
                  <div class="flex items-center gap-2">
                    <UAvatar
                      :src="
                        row.original.reviewer.image ||
                        row.original.reviewer.avatarUrl ||
                        undefined
                      "
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
                    {{ formatDate(row.original.publishedAt) }}
                  </span>
                </template>

                <template #review-cell="{ row }">
                  <NuxtLink
                    v-if="row.original.review?.id"
                    :to="`/reviews/${row.original.review.id}`"
                    class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {{ row.original.review.name }}
                  </NuxtLink>
                  <span v-else class="text-sm text-gray-400 dark:text-gray-600">
                    Not assigned
                  </span>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- Incoming Tab -->
          <div v-else-if="selectedTab === 'incoming'">
            <UCard>
              <div
                v-if="incomingFeedback.length === 0"
                class="text-center py-12"
              >
                <UIcon
                  name="i-heroicons-check-circle"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  No pending feedback
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  All feedback for this buddy has been reviewed and published
                </p>
              </div>

              <div v-else>
                <!-- Publish All Button -->
                <div class="mb-4">
                  <UButton color="success" @click="publishAllIncoming">
                    Publish All ({{ incomingFeedback.length }})
                  </UButton>
                </div>

                <UTable :columns="incomingColumns" :data="incomingFeedback">
                  <template #from-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
                        :src="
                          row.original.reviewer.image ||
                          row.original.reviewer.avatarUrl ||
                          undefined
                        "
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

                  <template #review-cell="{ row }">
                    <NuxtLink
                      v-if="row.original.review?.id"
                      :to="`/reviews/${row.original.review.id}`"
                      class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {{ row.original.review.name }}
                    </NuxtLink>
                    <span
                      v-else
                      class="text-sm text-gray-400 dark:text-gray-600"
                    >
                      Not assigned
                    </span>
                  </template>

                  <template #actions-cell="{ row }">
                    <UButton
                      loading-auto
                      size="xs"
                      @click="publishFeedback(row.original.id)"
                    >
                      Publish
                    </UButton>
                  </template>
                </UTable>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
