<script setup lang="ts">
import { format } from "date-fns";
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

useHead({
  title: "Buddy Feedback",
});

const toast = useToast();
const { buddies, hasBuddies, getBuddyById } = useBuddies();
const { selectedBuddyId } = useSelectedBuddy();
const { set: announce } = useAnnouncer();

/**
 * Local response shapes for query-string paths that can't be matched against
 * Nitro's typed routes. They mirror GetBuddyReceivedFeedbackResponseSchema and
 * GetForBuddyResponseSchema (serialized).
 */
interface FeedbackReviewer {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
}

interface BuddyReceivedFeedbackItem {
  id: string;
  content: string;
  createdAt: string | null;
  publishedAt: string | null;
  isRead: boolean | null;
  isFavourite: boolean;
  reviewer: FeedbackReviewer;
}

interface IncomingFeedbackItem {
  id: string;
  content: string;
  createdAt: string | null;
  revieweeId: string;
  reviewer: FeedbackReviewer;
}

interface ForBuddyResponse {
  buddyAssignments: {
    user: FeedbackReviewer;
    pendingCount: number;
    feedback: IncomingFeedbackItem[];
  }[];
}

// Fetch buddy received feedback (reactive based on selectedBuddyId)
const { data: buddyReceivedData, refresh: refreshBuddyReceived } = useApi<{
  feedback: BuddyReceivedFeedbackItem[];
}>(
  // Returning null skips the request until a buddy is selected; the route
  // types only accept string, hence the assertion.
  (() =>
    selectedBuddyId.value
      ? `/feedback/buddy-received?buddyId=${selectedBuddyId.value}`
      : null) as () => string,
  { key: () => `buddy-received-${selectedBuddyId.value}` },
);
const buddyReceivedFeedback = computed(
  () => buddyReceivedData.value?.feedback || [],
);

// Fetch incoming (unpublished) feedback for selected buddy
const { data: incomingData, refresh: refreshIncoming } = useApi<ForBuddyResponse>(
  (() =>
    selectedBuddyId.value
      ? `/feedback/for-buddy?buddyId=${selectedBuddyId.value}`
      : null) as () => string,
  { key: () => `buddy-incoming-${selectedBuddyId.value}` },
);
const incomingFeedback = computed(() => {
  const assignments = incomingData.value?.buddyAssignments || [];
  return assignments.flatMap((assignment) => assignment.feedback || []);
});

// Refresh both tabs when buddy changes
watch(selectedBuddyId, async (id) => {
  await Promise.all([refreshBuddyReceived(), refreshIncoming()]);
  const name = id ? getBuddyById(id)?.name : null;
  if (name) announce(`Showing feedback for ${name}`, "polite");
});

// Tab state
const selectedTab = ref("received");

const tabs = computed<TabsItem[]>(() => [
  {
    label: "Received",
    icon: "i-heroicons-inbox-arrow-down",
    badge:
      buddyReceivedFeedback.value.length > 0
        ? buddyReceivedFeedback.value.length
        : undefined,
    value: "received",
    slot: "received",
  },
  {
    label: "Incoming",
    icon: "i-heroicons-clock",
    badge:
      incomingFeedback.value.length > 0
        ? incomingFeedback.value.length
        : undefined,
    value: "incoming",
    slot: "incoming",
  },
]);

// Get unread count refresh function
const { refreshUnreadCount } = useUnreadCount();

// Fetch all buddy incoming counts (no buddyId filter)
const { data: allIncomingData, refresh: refreshAllIncoming } = useApi(
  "/feedback/for-buddy",
  { key: "buddy-incoming-all" },
);
const buddyIncomingCounts = computed(() => {
  const counts: Record<string, number> = {};
  const assignments = allIncomingData.value?.buddyAssignments || [];
  for (const assignment of assignments as Array<{ user: { id: string }; pendingCount: number }>) {
    if (assignment.pendingCount > 0) {
      counts[assignment.user.id] = assignment.pendingCount;
    }
  }
  return counts;
});

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Publish single feedback
const publishFeedback = async (feedbackId: string) => {
  try {
    await $api(`/feedback/${feedbackId}/publish`, {
      method: "PATCH",
      body: { publish: true },
    });
    await Promise.all([refreshIncoming(), refreshAllIncoming()]);
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
    await $api("/feedback/publish-batch", {
      method: "POST",
      body: { feedbackIds, publish: true },
    });
    await Promise.all([refreshIncoming(), refreshAllIncoming()]);
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
  {
    id: "actions",
    header: "Actions",
    meta: {
      class: {
        th: "text-right",
        td: "min-w-[120px]",
      },
    },
  },
];
</script>

<template>
  <UDashboardPanel id="buddy-feedback">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Buddy Feedback
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your buddy's feedback
          </p>
        </div>

        <!-- Buddy Selector -->
        <div v-if="hasBuddies" class="mb-6">
          <BuddySelector :buddy-id="selectedBuddyId || undefined" :counts="buddyIncomingCounts" @buddy-selected="handleBuddySelected" />
        </div>

        <!-- Tabs -->
        <UTabs
v-if="selectedBuddyId" v-model="selectedTab" :items="tabs" variant="pill" color="neutral" size="lg"
          class="w-full mb-6" :ui="{
            list: 'bg-gray-200 dark:bg-gray-800 rounded-xl p-1',
            trigger:
              'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
            indicator: 'bg-white dark:bg-gray-900 shadow-sm',
          }" />

        <!-- Tab Content -->
        <div v-if="selectedBuddyId" class="mt-6">
          <!-- Received Tab -->
          <div v-if="selectedTab === 'received'">
            <EmptyState
v-if="buddyReceivedFeedback.length === 0" icon="i-heroicons-inbox" icon-color="text-blue-500"
              icon-bg-color="bg-blue-100 dark:bg-blue-900/30" heading="No feedback received"
              description="This buddy hasn't received any published feedback yet" variant="secondary" />

            <UCard v-else>
              <UTable
:columns="receivedColumns" :data="buddyReceivedFeedback" :ui="{ tr: 'cursor-pointer' }"
                @select="(row: any) => openFeedbackModal(row.original ?? row)">
                <template #from-cell="{ row }">
                  <div class="flex items-center gap-2">
                    <UAvatar
:src="row.original.reviewer.image ||
                      row.original.reviewer.avatarUrl ||
                      undefined
                      " :alt="row.original.reviewer.name" size="xs" />
                    <span>{{ row.original.reviewer.name }}</span>
                  </div>
                </template>

                <template #content-cell="{ row }">
                  <span class="truncate block">{{ row.original.content }}</span>
                </template>

                <template #date-cell="{ row }">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(row.original.publishedAt) }}
                  </span>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- Incoming Tab -->
          <div v-else-if="selectedTab === 'incoming'">
            <EmptyState
v-if="incomingFeedback.length === 0" icon="i-heroicons-check-circle" icon-color="text-green-500"
              icon-bg-color="bg-green-100 dark:bg-green-900/30" heading="No pending feedback"
              description="All feedback for this buddy has been reviewed and published" variant="secondary" />

            <UCard v-else>
              <div>
                <!-- Publish All Button -->
                <div class="mb-4">
                  <UButton color="success" @click="publishAllIncoming">
                    Publish All ({{ incomingFeedback.length }})
                  </UButton>
                </div>

                <UTable
:columns="incomingColumns" :data="incomingFeedback" :ui="{ tr: 'cursor-pointer' }"
                  @select="(row: any) => openFeedbackModal(row.original ?? row)">
                  <template #from-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
:src="row.original.reviewer.image ||
                        row.original.reviewer.avatarUrl ||
                        undefined
                        " :alt="row.original.reviewer.name" size="xs" />
                      <span>{{ row.original.reviewer.name }}</span>
                    </div>
                  </template>

                  <template #content-cell="{ row }">
                    <span class="truncate block">{{ row.original.content }}</span>
                  </template>

                  <template #date-cell="{ row }">
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                      {{ formatDate(row.original.createdAt) }}
                    </span>
                  </template>

                  <template #actions-cell="{ row }">
                    <div class="flex gap-2 justify-end">
                      <UButton loading-auto @click.stop="publishFeedback(row.original.id)">
                        Publish
                      </UButton>
                    </div>
                  </template>
                </UTable>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Feedback Modal -->
  <FeedbackModal v-model="isModalOpen" :feedback="selectedFeedback" />
</template>
