<template>
  <UDashboardPanel id="insights">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Your Insights
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Track your feedback activity and discover patterns
          </p>
        </div>

        <!-- Stats cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Feedback given this week -->
          <UCard class="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Feedback Given
                  </p>
                  <p class="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {{ stats.feedbackGiven }}
                  </p>
                </div>
                <UIcon name="i-heroicons-paper-airplane" class="w-10 h-10 text-teal-500 dark:text-teal-400" />
              </div>
              <div class="flex items-center gap-2">
                <UBadge
:label="`${stats.feedbackGivenTrend > 0 ? '+' : ''}${stats.feedbackGivenTrend}%`"
                  :color="stats.feedbackGivenTrend > 0 ? 'primary' : 'error'" size="xs" />
                <span class="text-xs text-gray-600 dark:text-gray-400">vs last week</span>
              </div>
            </div>
          </UCard>

          <!-- Feedback received this week -->
          <UCard class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Feedback Received
                  </p>
                  <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {{ stats.feedbackReceived }}
                  </p>
                </div>
                <UIcon name="i-heroicons-inbox-arrow-down" class="w-10 h-10 text-blue-500 dark:text-blue-400" />
              </div>
              <div class="flex items-center gap-2">
                <UBadge
:label="`${stats.feedbackReceivedTrend > 0 ? '+' : ''}${stats.feedbackReceivedTrend}%`"
                  :color="stats.feedbackReceivedTrend > 0 ? 'primary' : 'error'" size="xs" />
                <span class="text-xs text-gray-600 dark:text-gray-400">vs last week</span>
              </div>
            </div>
          </UCard>

          <!-- Active goals count -->
          <UCard class="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Active Goals
                  </p>
                  <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {{ stats.activeGoals }}
                  </p>
                </div>
                <UIcon name="i-heroicons-flag" class="w-10 h-10 text-purple-500 dark:text-purple-400" />
              </div>
              <div class="flex items-center gap-2">
                <UBadge :label="`${stats.completedGoals} completed`" color="primary" size="xs" />
                <span class="text-xs text-gray-600 dark:text-gray-400">this month</span>
              </div>
            </div>
          </UCard>

          <!-- Next review countdown -->
          <UCard class="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-2">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Next Review
                  </p>
                  <p class="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {{
                      stats.daysUntilReview !== null
                        ? stats.daysUntilReview
                        : "—"
                    }}
                  </p>
                </div>
                <UIcon name="i-heroicons-calendar-days" class="w-10 h-10 text-amber-500 dark:text-amber-400" />
              </div>
              <div class="flex items-center gap-2">
                <UBadge
:label="stats.daysUntilReview !== null
                    ? 'Upcoming'
                    : 'Not scheduled'
                  " :color="stats.daysUntilReview !== null ? 'primary' : 'neutral'
                    " size="xs" />
                <span class="text-xs text-gray-600 dark:text-gray-400">
                  {{ stats.daysUntilReview !== null ? "days remaining" : "" }}
                </span>
              </div>
            </div>
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
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Feedback
                  </h2>
                  <UBadge v-if="unreadCount > 0" :label="`${unreadCount} unread`" color="primary" size="sm" />
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Latest feedback you've received
                </p>
              </div>
              <UButton to="/feedback/inbox" size="sm" trailing-icon="i-heroicons-arrow-right">
                View All
              </UButton>
            </div>

            <UTable v-if="recentFeedback.length > 0" :columns="feedbackColumns" :data="recentFeedback"
              :ui="{ tr: 'cursor-pointer' }"
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

              <template #status-cell="{ row }">
                <UBadge :color="row.original.isRead ? 'neutral' : 'primary'" size="xs">
                  {{ row.original.isRead ? "Read" : "Unread" }}
                </UBadge>
              </template>
            </UTable>

            <div v-else class="text-center py-12">
              <UIcon name="i-heroicons-chat-bubble-left-right" class="text-gray-400 text-4xl mb-2" />
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

useHead({
  title: "Insights",
});

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
  return feedback.slice(0, 5);
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

const formatDate = (date: string | Date | null | undefined) => {
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
