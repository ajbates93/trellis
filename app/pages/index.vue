<template>
  <UDashboardPanel id="home">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Welcome header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {{ user?.name?.split(' ')[0] || 'there' }}
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Here's what's happening with your feedback and goals
          </p>
        </div>

    <!-- Stats cards grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Feedback given this week -->
      <UCard>
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">Feedback Given</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats.feedbackGiven }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon name="i-heroicons-chat-bubble-left" class="text-primary text-xl" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <UBadge :label="`${stats.feedbackGivenTrend > 0 ? '+' : ''}${stats.feedbackGivenTrend}%`"
                  :color="stats.feedbackGivenTrend > 0 ? 'primary' : 'error'"
                  size="xs" />
          <span class="text-xs text-gray-600 dark:text-gray-400">vs last week</span>
        </div>
      </UCard>

      <!-- Feedback received this week -->
      <UCard>
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">Feedback Received</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats.feedbackReceived }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-inbox" class="text-green-500 text-xl" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <UBadge :label="`${stats.feedbackReceivedTrend > 0 ? '+' : ''}${stats.feedbackReceivedTrend}%`"
                  :color="stats.feedbackReceivedTrend > 0 ? 'primary' : 'error'"
                  size="xs" />
          <span class="text-xs text-gray-600 dark:text-gray-400">vs last week</span>
        </div>
      </UCard>

      <!-- Active goals count -->
      <UCard>
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">Active Goals</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats.activeGoals }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-flag" class="text-blue-500 text-xl" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <UBadge :label="`${stats.completedGoals} completed`"
                  color="primary"
                  size="xs" />
          <span class="text-xs text-gray-600 dark:text-gray-400">this month</span>
        </div>
      </UCard>

      <!-- Next review countdown -->
      <UCard>
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">Next Review</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ stats.daysUntilReview }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-calendar-days" class="text-purple-500 text-xl" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <UBadge label="Upcoming" color="primary" size="xs" />
          <span class="text-xs text-gray-600 dark:text-gray-400">days remaining</span>
        </div>
      </UCard>
    </div>

    <!-- Quick actions panel -->
    <UCard class="mb-8">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">Common tasks to help you stay on track</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UButton
            to="/feedback/give"
            color="primary"
            size="lg"
            icon="i-heroicons-chat-bubble-left"
          >
            Give Feedback
          </UButton>
          <UButton
            to="/goals"
            color="white"
            size="lg"
            icon="i-heroicons-flag"
          >
            View Goals
          </UButton>
          <UButton
            v-if="user?.isAdmin"
            to="/admin/dashboard"
            color="white"
            size="lg"
            icon="i-heroicons-shield-check"
          >
            Admin Panel
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Activity chart placeholder -->
    <UCard class="mb-8">
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Overview</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">Your feedback activity over the last 12 weeks</p>
        </div>
        <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-center">
            <UIcon name="i-heroicons-chart-bar" class="text-gray-400 text-4xl mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">Chart coming soon</p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Recent feedback -->
    <UCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Feedback</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Latest feedback you've received</p>
          </div>
          <UButton
            to="/feedback/inbox"
            color="white"
            size="sm"
            trailing-icon="i-heroicons-arrow-right"
          >
            View All
          </UButton>
        </div>

        <UTable
          v-if="recentFeedback.length > 0"
          :columns="feedbackColumns"
          :rows="recentFeedback"
        >
          <template #from-data="{ row }">
            <div class="flex items-center gap-2">
              <UAvatar
                :src="row.reviewer.image || row.reviewer.avatarUrl"
                :alt="row.reviewer.name"
                size="xs"
              />
              <span>{{ row.reviewer.name }}</span>
            </div>
          </template>

          <template #date-data="{ row }">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #status-data="{ row }">
            <UBadge :color="row.isRead ? 'gray' : 'primary'" size="xs">
              {{ row.isRead ? 'Read' : 'Unread' }}
            </UBadge>
          </template>
        </UTable>

        <div v-else class="text-center py-12">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="text-gray-400 text-4xl mb-2" />
          <p class="text-lg font-semibold text-gray-900 dark:text-white">No feedback yet</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">You haven't received any feedback yet. Check back later!</p>
        </div>
      </div>
    </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = useAuth()

// Mock stats data - will be replaced with API calls
const stats = ref({
  feedbackGiven: 5,
  feedbackGivenTrend: 25,
  feedbackReceived: 8,
  feedbackReceivedTrend: 14,
  activeGoals: 3,
  completedGoals: 2,
  daysUntilReview: 14
})

// Mock recent feedback - will be replaced with API calls
const recentFeedback = ref([
  // Empty for now - will fetch from API
])

const feedbackColumns = [
  {
    key: 'from',
    label: 'From'
  },
  {
    key: "content",
    label: "Feedback",
    class: "max-w-md truncate",
  },
  {
    key: "date",
    label: "Date",
  },
  {
    key: "status",
    label: "Status",
  },
];

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// TODO: Fetch real data from API
// onMounted(async () => {
//   const { data } = await $fetch('/api/dashboard/stats')
//   stats.value = data
// })
</script>
