<script setup lang="ts">
import { format } from "date-fns";

definePageMeta({
  layout: "default",
});

const toast = useToast();

// Tab state
const selectedTab = ref("received");

const tabs = [
  { label: "Received", value: "received" },
  { label: "Given", value: "given" },
  { label: "For My Buddies", value: "for-buddies" },
];

// Fetch received feedback (published only)
const { data: receivedData, refresh: refreshReceived } = await useFetch(
  "/api/feedback/received",
);
const receivedFeedback = computed(() => receivedData.value?.feedback || []);

// Fetch given feedback (all)
const { data: givenData } = await useFetch("/api/feedback/given");
const givenFeedback = computed(() => givenData.value?.feedback || []);

// Fetch buddy assignments with pending feedback
const { data: buddyData, refresh: refreshBuddy } = await useFetch(
  "/api/feedback/for-buddy",
);
const buddyAssignments = computed(
  () => buddyData.value?.buddyAssignments || [],
);

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

// Publish single feedback
const publishFeedback = async (feedbackId: string) => {
  try {
    await $fetch(`/api/feedback/${feedbackId}/publish`, { method: "PATCH" });
    await refreshBuddy();
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
    await refreshBuddy();
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

// Publish all for a specific user
const publishAllForUser = async (userId: string) => {
  const assignment = buddyAssignments.value.find((a) => a.user.id === userId);
  if (!assignment || assignment.feedback.length === 0) return;

  const feedbackIds = assignment.feedback.map((f) => f.id);
  return await publishBatch(feedbackIds);
};

// Format date helper
const formatDate = (date: string | Date) => {
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
const selectedFeedback = ref<any>(null);

// Open modal with selected feedback
const openFeedbackModal = (feedback: any) => {
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

const buddyFeedbackColumns = [
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
  { id: "actions", header: "" },
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
        <UTabs v-model="selectedTab" :items="tabs" class="mb-6" />

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
                        row.original.reviewer.avatarUrl
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
                  Give Feedback
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
                          row.original.reviewee.avatarUrl
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

          <!-- For My Buddies Tab -->
          <div v-else-if="selectedTab === 'for-buddies'">
            <div v-if="buddyAssignments.length === 0">
              <UCard>
                <div class="text-center py-12">
                  <UIcon
                    name="i-heroicons-users"
                    class="text-gray-400 text-4xl mb-2"
                  />
                  <p
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    You're not assigned as a buddy
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Contact your manager to be assigned as a buddy
                  </p>
                </div>
              </UCard>
            </div>

            <!-- Accordion for each buddy assignment -->
            <div v-else class="space-y-4">
              <UCard
                v-for="assignment in buddyAssignments"
                :key="assignment.user.id"
              >
                <!-- User header -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <UAvatar
                      :src="
                        assignment.user.image ||
                        assignment.user.avatarUrl ||
                        undefined
                      "
                      :alt="assignment.user.name"
                      size="md"
                    />
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-white">
                        {{ assignment.user.name }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ assignment.pendingCount }} pending feedback
                      </p>
                    </div>
                  </div>
                  <UButton
                    v-if="assignment.pendingCount > 0"
                    loading-auto
                    size="sm"
                    color="primary"
                    @click="publishAllForUser(assignment.user.id)"
                  >
                    Publish All ({{ assignment.pendingCount }})
                  </UButton>
                </div>

                <!-- Feedback table or empty state -->
                <div
                  v-if="assignment.pendingCount === 0"
                  class="text-center py-8"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-3xl mb-2"
                  />
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    All caught up!
                  </p>
                </div>

                <UTable
                  v-else
                  :columns="buddyFeedbackColumns"
                  :data="assignment.feedback"
                >
                  <template #from-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
                        :src="
                          row.original.reviewer.image ||
                          row.original.reviewer.avatarUrl
                        "
                        :alt="row.original.reviewer.name"
                        size="xs"
                      />
                      <span>{{ row.original.reviewer.name }}</span>
                    </div>
                  </template>

                  <template #content-cell="{ row }">
                    <UPopover>
                      <UButton
                        variant="ghost"
                        color="neutral"
                        class="w-full truncate text-left justify-start font-normal px-0 -mx-2.5 block overflow-hidden"
                      >
                        <span class="truncate block">{{
                          row.original.content
                        }}</span>
                      </UButton>
                      <template #content>
                        <div class="p-4 max-w-md">
                          <p class="text-sm whitespace-normal">
                            {{ row.original.content }}
                          </p>
                        </div>
                      </template>
                    </UPopover>
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
                      color="primary"
                      @click="publishFeedback(row.original.id)"
                    >
                      Publish
                    </UButton>
                  </template>
                </UTable>
              </UCard>
            </div>
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
