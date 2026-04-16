<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip } from "@unovis/vue";

interface SentimentData {
  positive: number;
  constructive: number;
  neutral: number;
}

interface UserSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  roleType: string | null;
  currentSentiment: SentimentData | null;
  dominantSentiment: "positive" | "constructive" | "neutral" | "none";
  trend: "improving" | "declining" | "stable" | "new";
  lastAnalyzed: string | null;
  feedbackCount: number;
}

interface TeamSummaryResponse {
  totalUsers: number;
  usersWithAnalysis: number;
  usersWithoutAnalysis: number;
  aggregateSentiment: SentimentData | null;
  users: UserSummary[];
}

const emit = defineEmits<{
  "user-selected": [userId: string, userName: string];
}>();

const loading = ref(true);
const refreshing = ref(false);
const error = ref(false);
const teamData = ref<TeamSummaryResponse | null>(null);
const showRefreshHint = ref(false);

// Fetch team summary
const fetchTeamData = async (isRefresh = false) => {
  if (isRefresh) {
    refreshing.value = true;
  } else {
    loading.value = true;
  }
  error.value = false;

  try {
    const data = await $api<TeamSummaryResponse>(
      "/admin/insights/team-summary"
    );
    teamData.value = data;
    showRefreshHint.value = false;
  } catch (e) {
    console.error("Failed to load team sentiment:", e);
    error.value = true;
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

// Fetch on mount
onMounted(() => fetchTeamData());

// Expose method to show refresh hint (called from parent when user analysis runs)
const indicateDataStale = () => {
  showRefreshHint.value = true;
};

defineExpose({ indicateDataStale });

// Chart data for aggregate sentiment
const chartData = computed(() => {
  if (!teamData.value?.aggregateSentiment) return [];

  const sentiment = teamData.value.aggregateSentiment;
  return [
    { label: "Positive", value: sentiment.positive },
    { label: "Constructive", value: sentiment.constructive },
    { label: "Neutral", value: sentiment.neutral },
  ];
});

const colors = ["#10b981", "#f59e0b", "#6b7280"]; // green, amber, gray

const template = (d: { label: string; value: number }) => {
  return `
    <div style="padding: 8px;">
      <div style="font-weight: 600; margin-bottom: 4px; text-transform: capitalize;">${d.label}</div>
      <div style="color: rgb(59, 130, 246);">${d.value}%</div>
    </div>
  `;
};

// Get trend icon and color
const getTrendInfo = (trend: string) => {
  switch (trend) {
    case "improving":
      return { icon: "i-heroicons-arrow-trending-up", color: "text-green-500" };
    case "declining":
      return { icon: "i-heroicons-arrow-trending-down", color: "text-red-500" };
    case "stable":
      return { icon: "i-heroicons-minus", color: "text-gray-400" };
    default:
      return { icon: "i-heroicons-sparkles", color: "text-purple-500" };
  }
};

// Get dominant sentiment badge color
const getSentimentBadgeColor = (sentiment: string) => {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    case "constructive":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    case "neutral":
      return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-500";
  }
};

// Format date relative
const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Team Sentiment Overview
        </h3>
        <div class="flex items-center gap-2">
          <UButton
            v-if="showRefreshHint"
            size="xs"
            color="primary"
            variant="soft"
            :loading="refreshing"
            @click="fetchTeamData(true)"
          >
            <UIcon name="i-heroicons-arrow-path" class="mr-1" />
            Refresh
          </UButton>
          <UIcon name="i-heroicons-users" class="text-primary text-xl" />
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-4xl text-gray-400"
      />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center h-64 text-red-500"
    >
      <p>Failed to load team sentiment data</p>
    </div>

    <!-- Content -->
    <div v-else-if="teamData" class="space-y-6">
      <!-- Stats Summary -->
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ teamData.totalUsers }}
          </p>
          <p class="text-xs text-gray-500">Total Users</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-green-500">
            {{ teamData.usersWithAnalysis }}
          </p>
          <p class="text-xs text-gray-500">Analyzed</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-400">
            {{ teamData.usersWithoutAnalysis }}
          </p>
          <p class="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      <!-- Aggregate Sentiment -->
      <div v-if="teamData.aggregateSentiment" class="flex items-center gap-6">
        <div class="h-28 w-28 flex-shrink-0">
          <VisSingleContainer :data="chartData" :height="112">
            <VisDonut
              :value="(d: any) => d.value"
              :color="(_: any, i: number) => colors[i]"
              :angle-range="[0, 2 * Math.PI]"
              :pad-angle="0.02"
              :corner-radius="4"
            />
            <VisTooltip :template="template" />
          </VisSingleContainer>
        </div>

        <div class="flex-1 space-y-1.5">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team Average
          </p>
          <div
            v-for="(item, index) in chartData"
            :key="item.label"
            class="flex items-center justify-between text-sm"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-2.5 h-2.5 rounded-full"
                :style="{ backgroundColor: colors[index] }"
              />
              <span class="text-gray-600 dark:text-gray-400">
                {{ item.label }}
              </span>
            </div>
            <span class="font-medium text-gray-900 dark:text-white">
              {{ item.value }}%
            </span>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-4 text-gray-500">
        <p class="text-sm">No aggregate data available yet</p>
        <p class="text-xs mt-1">
          Run analysis for users to see team overview
        </p>
      </div>

      <!-- User Breakdown Table -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4
          class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
        >
          By User
        </h4>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="user in teamData.users"
            :key="user.userId"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="emit('user-selected', user.userId, user.userName)"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                :src="user.avatarUrl || undefined"
                :alt="user.userName"
                size="sm"
              />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ user.userName }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ user.feedbackCount }} feedback
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Sentiment Badge -->
              <span
                v-if="user.dominantSentiment !== 'none'"
                class="text-xs px-2 py-0.5 rounded-full capitalize"
                :class="getSentimentBadgeColor(user.dominantSentiment)"
              >
                {{ user.dominantSentiment }}
              </span>
              <span
                v-else
                class="text-xs text-gray-400"
              >
                No data
              </span>

              <!-- Trend Indicator -->
              <UIcon
                v-if="user.lastAnalyzed"
                :name="getTrendInfo(user.trend).icon"
                :class="getTrendInfo(user.trend).color"
              />

              <!-- Last Analyzed -->
              <span
                v-if="user.lastAnalyzed"
                class="text-xs text-gray-400 w-16 text-right"
              >
                {{ formatRelativeDate(user.lastAnalyzed) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
