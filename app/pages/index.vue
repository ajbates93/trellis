<template>
  <UDashboardPanel id="home">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Welcome header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back,
            {{
              user?.preferredName ||
              user?.name?.split(" ")[0] ||
              "there"
            }}
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Here's what's happening with your feedback and goals
          </p>
        </div>

        <!-- Quick actions panel -->
        <UCard class="mb-8">
          <div
            class="flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Common tasks to help you stay on track
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <UButton
                to="/feedback/give"
                color="primary"
                size="lg"
                icon="i-heroicons-chat-bubble-left"
              >
                Submit Feedback
              </UButton>
              <UButton to="/goals" size="lg" icon="i-heroicons-flag">
                View Goals
              </UButton>
              <UButton
                v-if="user?.role === 'admin'"
                to="/admin/dashboard"
                size="lg"
                icon="i-heroicons-shield-check"
              >
                Admin Panel
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Stats cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Feedback given this week -->
          <UCard>
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Feedback Given
                </p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ stats.feedbackGiven }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="`${stats.feedbackGivenTrend > 0 ? '+' : ''}${stats.feedbackGivenTrend}%`"
                  :color="stats.feedbackGivenTrend > 0 ? 'primary' : 'error'"
                  size="xs"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400"
                  >vs last week</span
                >
              </div>
            </div>
            <UButton
              to="/feedback/inbox?tab=given"
              variant="outline"
              size="sm"
              class="mt-4 w-full justify-between"
              trailing-icon="i-heroicons-arrow-right"
            >
              View
            </UButton>
          </UCard>

          <!-- Feedback received this week -->
          <UCard>
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Feedback Received
                </p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ stats.feedbackReceived }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="`${stats.feedbackReceivedTrend > 0 ? '+' : ''}${stats.feedbackReceivedTrend}%`"
                  :color="stats.feedbackReceivedTrend > 0 ? 'primary' : 'error'"
                  size="xs"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400"
                  >vs last week</span
                >
              </div>
            </div>
            <UButton
              to="/feedback/inbox"
              variant="outline"
              size="sm"
              class="mt-4 w-full justify-between"
              trailing-icon="i-heroicons-arrow-right"
            >
              View
            </UButton>
          </UCard>

          <!-- Active goals count -->
          <UCard>
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Active Goals
                </p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ stats.activeGoals }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="`${stats.completedGoals} completed`"
                  color="primary"
                  size="xs"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400"
                  >this month</span
                >
              </div>
            </div>
            <UButton
              to="/goals"
              variant="outline"
              size="sm"
              class="mt-4 w-full justify-between"
              trailing-icon="i-heroicons-arrow-right"
            >
              View
            </UButton>
          </UCard>

          <!-- Next review countdown -->
          <UCard>
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Next Review
                </p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{
                    stats.daysUntilReview !== null ? stats.daysUntilReview : "—"
                  }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :label="
                    stats.daysUntilReview !== null
                      ? 'Upcoming'
                      : 'Not scheduled'
                  "
                  :color="stats.daysUntilReview !== null ? 'primary' : 'gray'"
                  size="xs"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  {{ stats.daysUntilReview !== null ? "days remaining" : "" }}
                </span>
              </div>
            </div>
            <UButton
              to="/reviews"
              variant="outline"
              size="sm"
              class="mt-4 w-full justify-between"
              trailing-icon="i-heroicons-arrow-right"
            >
              View
            </UButton>
          </UCard>
        </div>

        <!-- Activity chart -->
        <FeedbackActivityChart class="mb-8" />

        <!-- Sentiment Analysis -->
        <SentimentAnalysis class="mb-8" />

        <!-- Recent feedback -->
        <UCard>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <h2
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Recent Feedback
                  </h2>
                  <UBadge
                    v-if="unreadCount > 0"
                    :label="`${unreadCount} unread`"
                    color="primary"
                    size="sm"
                  />
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Latest feedback you've received
                </p>
              </div>
              <UButton
                to="/feedback/inbox"
                size="sm"
                trailing-icon="i-heroicons-arrow-right"
              >
                View All
              </UButton>
            </div>

            <UTable
              v-if="recentFeedback.length > 0"
              :columns="feedbackColumns"
              :data="recentFeedback"
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
                  <span class="truncate block">{{ row.original.content }}</span>
                </UButton>
              </template>

              <template #date-cell="{ row }">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(row.original.publishedAt) }}
                </span>
              </template>

              <template #status-cell="{ row }">
                <UBadge
                  :color="row.original.isRead ? 'gray' : 'primary'"
                  size="xs"
                >
                  {{ row.original.isRead ? "Read" : "Unread" }}
                </UBadge>
              </template>
            </UTable>

            <div v-else class="text-center py-12">
              <UIcon
                name="i-heroicons-chat-bubble-left-right"
                class="text-gray-400 text-4xl mb-2"
              />
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                No feedback yet
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                You haven't received any feedback yet. Check back later!
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Feedback Modal -->
  <FeedbackModal v-model="isModalOpen" :feedback="selectedFeedback" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const { user } = useAuth();

// Fetch goals data
const { data: goalsData } = await useFetch("/api/goals");
const goals = computed(() => goalsData.value?.goals || []);

// Calculate goal stats
const activeGoalsCount = computed(
  () => goals.value.filter((g) => g.status === "active").length,
);

const completedGoalsThisMonth = computed(() => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return goals.value.filter((g) => {
    if (g.status !== "completed" || !g.completedAt) return false;
    const completedDate = new Date(g.completedAt);
    return completedDate >= firstDayOfMonth;
  }).length;
});

// Fetch dashboard stats
const { data: dashboardStats } = await useFetch("/api/dashboard/stats");

// Fetch recent feedback (limit to 5)
const { data: feedbackData } = await useFetch("/api/feedback/received");
const recentFeedback = computed(() => {
  const feedback = feedbackData.value?.feedback || [];
  return feedback.slice(0, 5); // Limit to 5 most recent
});

// Fetch unread feedback count
const { unreadCount } = useUnreadCount();

// Combine stats with goals data
const stats = computed(() => ({
  feedbackGiven: dashboardStats.value?.feedbackGiven || 0,
  feedbackGivenTrend: dashboardStats.value?.feedbackGivenTrend || 0,
  feedbackReceived: dashboardStats.value?.feedbackReceived || 0,
  feedbackReceivedTrend: dashboardStats.value?.feedbackReceivedTrend || 0,
  activeGoals: activeGoalsCount.value,
  completedGoals: completedGoalsThisMonth.value,
  daysUntilReview: dashboardStats.value?.daysUntilReview || null,
}));

const feedbackColumns = [
  {
    id: "from",
    accessorKey: "reviewer",
    header: "From",
  },
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
  {
    id: "date",
    accessorKey: "publishedAt",
    header: "Date",
  },
  {
    id: "status",
    accessorKey: "isRead",
    header: "Status",
  },
];

const formatDate = (date: string | Date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Modal state
const isModalOpen = ref(false);
const selectedFeedback = ref<any>(null);

// Open modal with selected feedback
const openFeedbackModal = (feedback: any) => {
  selectedFeedback.value = feedback;
  isModalOpen.value = true;
};
</script>
