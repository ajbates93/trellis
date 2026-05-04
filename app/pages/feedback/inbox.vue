<script setup lang="ts">
import { format } from "date-fns";
import type { TabsItem } from '@nuxt/ui'
import type { FeedbackWithReviewer, FeedbackWithReviewee } from "~/types";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Feedback Inbox",
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
    label: "Unread",
    icon: "i-heroicons-envelope",
    badge: unreadFeedback.value.length > 0 ? unreadFeedback.value.length : undefined,
    value: "unread",
    slot: "unread",
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
const { data: receivedData, refresh: refreshReceived } = await useApi(
  "/feedback/received",
);
const receivedFeedback = computed(() => receivedData.value?.feedback || []);

// Table feedback is all received feedback
const tableFeedback = computed(() => receivedFeedback.value);

// Favourites
const favouritesFeedback = computed(() =>
  receivedFeedback.value.filter((f: FeedbackWithReviewer) => f.isFavourite)
);

const setFavouriteLocally = (feedbackId: string, value: boolean) => {
  if (!receivedData.value?.feedback) return;
  // useApi returns a shallowRef, so we must replace .value to trigger reactivity.
  receivedData.value = {
    ...receivedData.value,
    feedback: receivedData.value.feedback.map((f: FeedbackWithReviewer) =>
      f.id === feedbackId ? { ...f, isFavourite: value } : f
    ),
  };
};

// Unread feedback for Unread tab
const unreadFeedback = computed(() => {
  return receivedFeedback.value.filter((fb: FeedbackWithReviewer) => !fb.isRead);
});

// Fetch given feedback (all)
const { data: givenData } = await useApi("/feedback/given");
const givenFeedback = computed(() => givenData.value?.feedback || []);

// Get unread count refresh function
const { refreshUnreadCount } = useUnreadCount();

// Mark feedback as read
const markAsRead = async (feedbackId: string) => {
  try {
    await $api(`/feedback/${feedbackId}/read`, { method: "PATCH" });
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
const selectedFeedback = ref<FeedbackWithReviewer | FeedbackWithReviewee | null>(null);

// Open modal with selected feedback
const openFeedbackModal = (feedback: FeedbackWithReviewer | FeedbackWithReviewee) => {
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
  { id: "date", accessorKey: "createdAt", header: "Submitted" },
  // { id: "review", accessorKey: "review", header: "Review" },
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
  { id: "date", accessorKey: "createdAt", header: "Submitted" },
  // { id: "review", accessorKey: "review", header: "Review" },
  { id: "status", accessorKey: "published", header: "Status" },
];
</script>

<template>
  <UDashboardPanel id="feedback-inbox">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Feedback Inbox
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your feedback
          </p>
        </div>

        <!-- Tabs -->
        <UTabs
v-model="selectedTab" :items="tabs" variant="pill" color="neutral" size="lg" class="w-full mb-6" :ui="{
          list: 'bg-gray-200 dark:bg-gray-800 rounded-xl p-1',
          trigger: 'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
          indicator: 'bg-white dark:bg-gray-900 shadow-sm',
        }" />

        <!-- Tab Content -->
        <div class="mt-6">
          <div v-if="selectedTab === 'received'">
            <EmptyState
v-if="receivedFeedback.length === 0" icon="i-heroicons-inbox" icon-color="text-blue-500"
              icon-bg-color="bg-blue-100 dark:bg-blue-900/30" heading="No feedback received yet"
              description="Check back later for feedback from your colleagues" variant="secondary" />

            <template v-else>
              <FeedbackFavouritesStrip
                :favourites="favouritesFeedback"
                @open="openFeedbackModal"
                @unfavourite="(id) => setFavouriteLocally(id, false)"
              />

              <UCard v-if="tableFeedback.length > 0">
                <UTable
:columns="receivedColumns" :data="tableFeedback" :ui="{
                  tr: 'group cursor-pointer data-[unread=true]:border-l-2 data-[unread=true]:border-l-primary-500',
                }" :get-row-attrs="(row: FeedbackWithReviewer) => ({ 'data-unread': !row.isRead })"
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

                  <template #status-cell="{ row }">
                    <UBadge
:label="row.original.isRead ? 'Read' : 'Unread'"
                      :color="row.original.isRead ? 'neutral' : 'primary'" size="sm" />
                  </template>

                  <template #actions-cell="{ row }">
                    <div class="flex items-center justify-end gap-1">
                      <FeedbackFavouriteToggle
                        :feedback-id="row.original.id"
                        :is-favourite="row.original.isFavourite"
                        size="xs"
                        class="opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100 transition-opacity"
                        :data-active="row.original.isFavourite"
                        @update:is-favourite="(v) => setFavouriteLocally(row.original.id, v)"
                      />
                      <UButton
v-if="!row.original.isRead" loading-auto size="xs" variant="ghost"
                        @click.stop="markAsRead(row.original.id)">
                        Mark as Read
                      </UButton>
                    </div>
                  </template>
                </UTable>
              </UCard>
            </template>
          </div>

          <!-- Unread Tab -->
          <div v-else-if="selectedTab === 'unread'">
            <EmptyState
v-if="unreadFeedback.length === 0" icon="i-heroicons-check-circle" icon-color="text-green-500"
              icon-bg-color="bg-green-100 dark:bg-green-900/30" heading="All caught up!"
              description="You have no unread feedback" variant="secondary" />

            <UCard v-else>
              <UTable
:columns="receivedColumns" :data="unreadFeedback" :ui="{
                tr: 'group cursor-pointer border-l-2 border-l-primary-500',
              }" :get-row-attrs="(row: FeedbackWithReviewer) => ({ 'data-unread': true })"
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

                <template #status-cell>
                  <UBadge label="Unread" color="primary" size="sm" />
                </template>

                <template #actions-cell="{ row }">
                  <div class="flex items-center justify-end gap-1">
                    <FeedbackFavouriteToggle
                      :feedback-id="row.original.id"
                      :is-favourite="row.original.isFavourite"
                      size="xs"
                      class="opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100 transition-opacity"
                      :data-active="row.original.isFavourite"
                      @update:is-favourite="(v) => setFavouriteLocally(row.original.id, v)"
                    />
                    <UButton loading-auto size="xs" variant="ghost" @click.stop="markAsRead(row.original.id)">
                      Mark as Read
                    </UButton>
                  </div>
                </template>
              </UTable>
            </UCard>
          </div>

          <!-- Given Tab -->
          <div v-else-if="selectedTab === 'given'">
            <EmptyState
v-if="givenFeedback.length === 0" icon="i-heroicons-chat-bubble-left" icon-color="text-blue-500"
              icon-bg-color="bg-blue-100 dark:bg-blue-900/30" heading="You haven't given any feedback yet"
              description="Start by giving feedback to your colleagues" button-text="Submit Feedback"
              button-to="/feedback/give" variant="primary" />

            <UCard v-else>
              <div>
                <!-- Filter Controls -->
                <div class="mb-4 flex items-center gap-2">
                  <USelect
v-model="selectedRecipient" :items="recipients" placeholder="Filter by recipient"
                    class="w-64" />
                  <UButton
v-if="selectedRecipient" variant="ghost" color="primary" icon="i-heroicons-x-mark" size="sm"
                    @click="clearRecipientFilter">
                    Clear
                  </UButton>
                  <span v-if="selectedRecipient" class="text-sm text-gray-500 dark:text-gray-400">
                    Showing {{ filteredGivenFeedback.length }} of
                    {{ givenFeedback.length }} items
                  </span>
                </div>

                <UTable
:columns="givenColumns" :data="filteredGivenFeedback" :ui="{ tr: 'cursor-pointer' }"
                  @select="(row: any) => openFeedbackModal(row.original ?? row)">
                  <template #to-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <UAvatar
:src="row.original.reviewee.image ||
                        row.original.reviewee.avatarUrl ||
                        undefined
                        " :alt="row.original.reviewee.name" size="xs" />
                      <span>{{ row.original.reviewee.name }}</span>
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

                  <template #status-cell="{ row }">
                    <UBadge
:label="row.original.published ? 'Published' : 'Pending'"
                      :color="row.original.published ? 'success' : 'neutral'" size="xs" />
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
    @update:is-favourite="(id, v) => setFavouriteLocally(id, v)"
  />
</template>
