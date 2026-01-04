<template>
  <UDashboardPanel id="admin-dashboard">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <UIcon
                  name="i-heroicons-shield-check"
                  class="text-purple-500 text-3xl"
                />
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
              </div>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                Platform management and analytics
              </p>
            </div>
            <div v-if="stats" class="text-right">
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.totalUsers }}
                <span class="text-sm font-normal text-gray-500">
                  ({{ stats.activeUsers }} active, {{ stats.invitedUsers }} invited)
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminStatsCard
            v-if="stats"
            title="Feedback This Week"
            :value="stats.feedbackThisWeek"
            :subtitle="`${stats.totalFeedback} total`"
            icon="i-heroicons-chat-bubble-left-right"
            color="primary"
          />
          <AdminStatsCard
            v-if="stats"
            title="Active Goals"
            :value="stats.activeGoals"
            subtitle="Currently in progress"
            icon="i-heroicons-flag"
            color="success"
          />
          <AdminStatsCard
            v-if="stats"
            title="Pending Reviews"
            :value="stats.pendingReviews"
            subtitle="Scheduled"
            icon="i-heroicons-calendar"
            color="warning"
          />
          <AdminStatsCard
            v-if="stats"
            title="Active Users"
            :value="stats.activeUsers"
            :subtitle="`${stats.invitedUsers} invited`"
            icon="i-heroicons-users"
            color="primary"
          />
        </div>

        <!-- AI Insights Row -->
        <div class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <UIcon name="i-heroicons-sparkles" class="text-purple-500 text-xl" />
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              AI Sentiment Analysis
            </h2>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientOnly>
              <AdminTeamSentimentCard ref="teamSentimentCard" @user-selected="onTeamUserSelected" />
            </ClientOnly>
            <ClientOnly>
              <AdminUserSentimentCard ref="userSentimentCard" @analysis-completed="onUserAnalysisCompleted" />
            </ClientOnly>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClientOnly>
            <AdminEngagementChart />
          </ClientOnly>
          <ClientOnly>
            <AdminFeedbackDistribution />
          </ClientOnly>
        </div>

        <!-- Bottom Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminTopContributors />
          <AdminRecentActivity />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

const stats = ref<any>(null);

// Reference to team sentiment card for triggering refresh hint
const teamSentimentCard = ref<{ indicateDataStale: () => void } | null>(null);

// Reference to user sentiment card for selection from team card
const userSentimentCard = ref<{ selectUser: (userId: string) => void } | null>(null);

// Called when user analysis is completed
const onUserAnalysisCompleted = () => {
  teamSentimentCard.value?.indicateDataStale();
};

// Called when user is selected from team sentiment card
const onTeamUserSelected = (userId: string) => {
  userSentimentCard.value?.selectUser(userId);
};

onMounted(async () => {
  try {
    const data = await $fetch("/api/admin/stats");
    if (data) {
      stats.value = data;
    }
  } catch (e) {
    console.error("Failed to load admin stats:", e);
  }
});
</script>
