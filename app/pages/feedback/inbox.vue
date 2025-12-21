<script setup lang="ts">
import { format } from "date-fns";
import type { TabsItem } from '@nuxt/ui'
import type { FeedbackWithReviewer } from "~/types";

definePageMeta({
  layout: "default",
});

const toast = useToast();

// Mark onboarding task as complete on page visit
const { markTaskComplete } = useOnboarding();
onMounted(() => {
  markTaskComplete("view-inbox");
});

// Tab state
const selectedTab = ref("received");

const tabs = computed<TabsItem[]>(() => [
  {
    label: "Received",
    icon: "i-heroicons-inbox-arrow-down",
    badge: receivedFeedback.value.length > 0 ? receivedFeedback.value.length : undefined,
    value: "received",
    slot: "received",
  },
  {
    label: "Given",
    icon: "i-heroicons-paper-airplane",
    badge: givenFeedback.value.length > 0 ? givenFeedback.value.length : undefined,
    value: "given",
    slot: "given",
  },
]);

// Fetch received feedback (published only)
const { data: receivedData, refresh: refreshReceived } = await useFetch(
  "/api/feedback/received",
);
const receivedFeedback = computed(() => receivedData.value?.feedback || []);

// Fetch given feedback (all)
const { data: givenData } = await useFetch("/api/feedback/given");
const givenFeedback = computed(() => givenData.value?.feedback || []);

// Get unread count refresh function
const { refreshUnreadCount } = useUnreadCount();

// Mark feedback as read
const markAsRead = async (feedbackId: string) => {
  try {
    await $fetch(`/api/feedback/${feedbackId}/read`, { method: "PATCH" });
    await refreshReceived();
    await refreshUnreadCount(); // Refresh unread count globally
    toast.add({
      title: "Marked as read",
      color: "success",
      icon: "i-heroicons-check",
    });
  } catch (error) {
    console.error("Failed to mark as read:", error);
    toast.add({
      title: "Failed to mark as read",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    throw error;
  }
};

// Format date helper
const formatDate = (date: string | Date | null) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM d, yyyy");
};

// Filter state for Given tab
const selectedRecipient = ref<string | null>(null);

// Get unique recipients from given feedback
const recipients = computed(() => {
  const uniqueRecipients = new Map();

  givenFeedback.value.forEach((fb) => {
    if (!uniqueRecipients.has(fb.reviewee.id)) {
      uniqueRecipients.set(fb.reviewee.id, {
        value: fb.reviewee.id,
        label: fb.reviewee.name,
        avatar: fb.reviewee.avatarUrl || fb.reviewee.image,
      });
    }
  });

  return Array.from(uniqueRecipients.values());
});

// Filtered given feedback based on selected recipient
const filteredGivenFeedback = computed(() => {
  if (!selectedRecipient.value) {
    return givenFeedback.value;
  }
  return givenFeedback.value.filter(
    (fb) => fb.reviewee.id === selectedRecipient.value,
  );
});

// Clear recipient filter
const clearRecipientFilter = () => {
  selectedRecipient.value = null;
};

// Modal state
const isModalOpen = ref(false);
const selectedFeedback = ref<FeedbackWithReviewer | null>(null);

// Open modal with selected feedback
const openFeedbackModal = (feedback: FeedbackWithReviewer) => {
  selectedFeedback.value = feedback;
  isModalOpen.value = true;
};

// Handle mark as read from modal
const handleMarkAsReadFromModal = async (feedbackId: string) => {
  await markAsRead(feedbackId);
  isModalOpen.value = false;
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
  { id: "status", accessorKey: "isRead", header: "Status" },
  { id: "actions", header: "" },
];

const givenColumns = [
  { id: "to", accessorKey: "reviewee", header: "To" },
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
  { id: "status", accessorKey: "published", header: "Status" },
];
</script>

<template>
  <UDashboardPanel id="feedback-inbox">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Feedback Inbox
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your feedback
          </p>
        </div>

        <!-- Tabs -->
        <UTabs
          v-model="selectedTab"
          :items="tabs"
          variant="pill"
          color="neutral"
          size="lg"
          class="w-full mb-6"
          :ui="{
            list: 'bg-gray-200 dark:bg-gray-800 rounded-xl p-1',
            trigger: 'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
            indicator: 'bg-white dark:bg-gray-900 shadow-sm',
          }"
        />

        <!-- Tab Content -->
        <div class="mt-6">
          <!-- Received Tab -->
          <div v-if="selectedTab === 'received'">
            <UCard>
              <div
                v-if="receivedFeedback.length === 0"
                class="text-center py-12"
              >
                <UIcon
                  name="i-heroicons-inbox"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  No feedback received yet
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Check back later for feedback from your colleagues
                </p>
              </div>

              <UTable
                v-else
                :columns="receivedColumns"
                :data="receivedFeedback"
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

                <template #status-cell="{ row }">
                  <UBadge
                    :label="row.original.isRead ? 'Read' : 'Unread'"
                    :color="row.original.isRead ? 'neutral' : 'primary'"
                    size="xs"
                  />
                </template>

                <template #actions-cell="{ row }">
                  <UButton
                    v-if="!row.original.isRead"
                    loading-auto
                    size="xs"
                    variant="ghost"
                    @click="markAsRead(row.original.id)"
                  >
                    Mark as Read
                  </UButton>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- Given Tab -->
          <div v-else-if="selectedTab === 'given'">
            <UCard>
              <div v-if="givenFeedback.length === 0" class="text-center py-12">
                <UIcon
                  name="i-heroicons-chat-bubble-left"
                  class="text-gray-400 text-4xl mb-2"
                />
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  You haven't given any feedback yet
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Start by giving feedback to your colleagues
                </p>
                <UButton to="/feedback/give" color="primary">
                  Submit Feedback
                </UButton>
              </div>

              <div v-else>
                <!-- Filter Controls -->
                <div class="mb-4 flex items-center gap-2">
                  <USelect
                    v-model="selectedRecipient"
                    :items="recipients"
                    placeholder="Filter by recipient"
                    class="w-64"
                  />
                  <UButton
                    v-if="selectedRecipient"
                    variant="ghost"
                    color="primary"
                    icon="i-heroicons-x-mark"
                    size="sm"
                    @click="clearRecipientFilter"
                  >
                    Clear
                  </UButton>
                  <span
                    v-if="selectedRecipient"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    Showing {{ filteredGivenFeedback.length }} of
                    {{ givenFeedback.length }} items
                  </span>
                </div>

                <UTable :columns="givenColumns" :data="filteredGivenFeedback">
                  <template #to-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
                        :src="
                          row.original.reviewee.image ||
                          row.original.reviewee.avatarUrl ||
                          undefined
                        "
                        :alt="row.original.reviewee.name"
                        size="xs"
                      />
                      <span>{{ row.original.reviewee.name }}</span>
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

                  <template #status-cell="{ row }">
                    <UBadge
                      :label="row.original.published ? 'Published' : 'Pending'"
                      :color="row.original.published ? 'success' : 'neutral'"
                      size="xs"
                    />
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
  <FeedbackModal
    v-model="isModalOpen"
    :feedback="selectedFeedback"
    :show-mark-as-read="selectedTab === 'received'"
    @mark-as-read="handleMarkAsReadFromModal"
  />
</template>
