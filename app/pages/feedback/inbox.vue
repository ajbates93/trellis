<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import type { TabsItem } from '@nuxt/ui'
import type { FeedbackWithReviewer } from "~/types";

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
const { data: receivedData, refresh: refreshReceived } = await useFetch(
  "/api/feedback/received",
);
const receivedFeedback = computed(() => receivedData.value?.feedback || []);

// Get 3 most recent received feedback items for spotlight cards
const spotlightFeedback = computed(() => {
  return receivedFeedback.value.slice(0, 3);
});

// Get spotlight IDs for filtering
const spotlightIds = computed(() => new Set(spotlightFeedback.value.map((fb: FeedbackWithReviewer) => fb.id)));

// Table feedback excludes spotlight items
const tableFeedback = computed(() => {
  return receivedFeedback.value.filter((fb: FeedbackWithReviewer) => !spotlightIds.value.has(fb.id));
});

// Unread feedback for Unread tab
const unreadFeedback = computed(() => {
  return receivedFeedback.value.filter((fb: FeedbackWithReviewer) => !fb.isRead);
});

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

// Format relative time helper
const formatRelativeTime = (date: string | Date | null) => {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Get readable role label
const getRoleLabel = (roleType: string | null) => {
  if (!roleType) return null;
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
  };
  return labels[roleType] || roleType;
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
  { id: "date", accessorKey: "createdAt", header: "Date" },
  // { id: "review", accessorKey: "review", header: "Review" },
  { id: "status", accessorKey: "published", header: "Status" },
];
</script>

<template>
  <UDashboardPanel id="feedback-inbox">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
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
              <!-- Spotlight Cards for Recent Feedback -->
              <div v-if="spotlightFeedback.length > 0" class="mb-6">
                <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
                  Recent Feedback
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
v-for="feedback in spotlightFeedback" :key="feedback.id"
                    class="cursor-pointer group text-left flex flex-col items-stretch bg-gradient-to-br from-slate-800/50 to-slate-700/30 dark:from-slate-800/40 dark:to-slate-700/20 rounded-xl p-4 border border-slate-600/40 dark:border-slate-500/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-slate-500/60 dark:hover:border-slate-400/40"
                    @click="openFeedbackModal(feedback)">
                    <div class="flex items-start gap-4 flex-1">
                      <UAvatar
:src="feedback.reviewer.image || feedback.reviewer.avatarUrl || undefined"
                        :alt="feedback.reviewer.name" size="lg" class="flex-shrink-0" />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2 mb-1">
                          <div class="min-w-0">
                            <span class="font-semibold text-gray-900 dark:text-white truncate block">
                              {{ feedback.reviewer.name }}
                            </span>
                            <span v-if="feedback.reviewer.roleType" class="text-xs text-slate-500 dark:text-slate-400">
                              {{ getRoleLabel(feedback.reviewer.roleType) }}
                            </span>
                          </div>
                          <span class="text-xs text-slate-400 dark:text-slate-400 flex-shrink-0">
                            {{ formatRelativeTime(feedback.publishedAt) }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {{ feedback.content }}
                        </p>
                      </div>
                    </div>
                    <div class="mt-3 flex items-center justify-between">
                      <UBadge
:label="feedback.isRead ? 'Read' : 'Unread'"
                        :color="feedback.isRead ? 'neutral' : 'primary'" size="sm" />
                      <UIcon
name="i-heroicons-arrow-right"
                        class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                </div>
              </div>

              <UCard v-if="tableFeedback.length > 0">
                <UTable
:columns="receivedColumns" :data="tableFeedback" :ui="{
                  tr: 'data-[unread=true]:border-l-2 data-[unread=true]:border-l-primary-500',
                }" :get-row-attrs="(row: FeedbackWithReviewer) => ({ 'data-unread': !row.isRead })">
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
                      {{ formatDate(row.original.publishedAt) }}
                    </span>
                  </template>

                  <!-- <template #review-cell="{ row }">
                    <NuxtLink v-if="row.original.review?.id" :to="`/reviews/${row.original.review.id}`"
                      class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                      {{ row.original.review.name }}
                    </NuxtLink>
                    <span v-else class="text-sm text-gray-400 dark:text-gray-600">
                      Not assigned
                    </span>
                  </template> -->

                  <template #status-cell="{ row }">
                    <UBadge
:label="row.original.isRead ? 'Read' : 'Unread'"
                      :color="row.original.isRead ? 'neutral' : 'primary'" size="sm" />
                  </template>

                  <template #actions-cell="{ row }">
                    <UButton
v-if="!row.original.isRead" loading-auto size="xs" variant="ghost"
                      @click="markAsRead(row.original.id)">
                      Mark as Read
                    </UButton>
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
                tr: 'border-l-2 border-l-primary-500',
              }" :get-row-attrs="(row: FeedbackWithReviewer) => ({ 'data-unread': true })">
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
                    {{ formatDate(row.original.publishedAt) }}
                  </span>
                </template>

                <!-- <template #review-cell="{ row }">
                  <NuxtLink v-if="row.original.review?.id" :to="`/reviews/${row.original.review.id}`"
                    class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    {{ row.original.review.name }}
                  </NuxtLink>
                  <span v-else class="text-sm text-gray-400 dark:text-gray-600">
                    Not assigned
                  </span>
                </template> -->

                <template #status-cell>
                  <UBadge label="Unread" color="primary" size="sm" />
                </template>

                <template #actions-cell="{ row }">
                  <UButton loading-auto size="xs" variant="ghost" @click="markAsRead(row.original.id)">
                    Mark as Read
                  </UButton>
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

                <UTable :columns="givenColumns" :data="filteredGivenFeedback">
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

                  <!-- <template #review-cell="{ row }">
                    <NuxtLink v-if="row.original.review?.id" :to="`/reviews/${row.original.review.id}`"
                      class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                      {{ row.original.review.name }}
                    </NuxtLink>
                    <span v-else class="text-sm text-gray-400 dark:text-gray-600">
                      Not assigned
                    </span>
                  </template> -->

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
v-model="isModalOpen" :feedback="selectedFeedback" :show-mark-as-read="selectedTab === 'received'"
    @mark-as-read="handleMarkAsReadFromModal" />
</template>
