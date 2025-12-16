<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip } from "@unovis/vue";

interface SentimentData {
  positive: number;
  constructive: number;
  neutral: number;
}

interface Theme {
  theme: string;
  count: number;
  sentiment: string;
  confidence: number;
}

interface SuggestedGoal {
  goal: string;
  rationale: string;
  priority: string;
}

interface InsightsResponse {
  hasAnalysis: boolean;
  userName?: string;
  message?: string;
  lastAnalyzed?: string;
  feedbackCount?: number;
  newFeedbackSinceAnalysis?: number;
  data?: {
    sentimentData: SentimentData;
    themes: Theme[];
    suggestedGoals: SuggestedGoal[];
  };
}

const emit = defineEmits<{
  "analysis-completed": [];
}>();

const selectedUserId = ref<string>("");
const loading = ref(false);
const analyzing = ref(false);
const insights = ref<InsightsResponse | null>(null);
const error = ref<string | null>(null);

// Fetch insights when user is selected
const fetchInsights = async (userId: string) => {
  if (!userId) {
    insights.value = null;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const data = await $fetch<InsightsResponse>(
      `/api/admin/insights/${userId}`
    );
    insights.value = data;
  } catch (e) {
    console.error("Failed to fetch insights:", e);
    error.value = (e as { data?: { message?: string } }).data?.message || "Failed to fetch insights";
    insights.value = null;
  } finally {
    loading.value = false;
  }
};

// Trigger analysis for selected user
const triggerAnalysis = async () => {
  if (!selectedUserId.value) return;

  analyzing.value = true;
  error.value = null;

  try {
    const data = await $fetch<InsightsResponse & { data: { feedbackCount: number } }>(`/api/admin/insights/${selectedUserId.value}`, {
      method: "POST",
    });

    // Refresh insights after analysis
    insights.value = {
      hasAnalysis: true,
      userName: data.userName,
      lastAnalyzed: data.lastAnalyzed,
      feedbackCount: data.data?.feedbackCount,
      newFeedbackSinceAnalysis: 0,
      data: data.data,
    };

    // Notify parent that analysis was completed
    emit("analysis-completed");
  } catch (e) {
    console.error("Failed to analyze:", e);
    error.value = (e as { data?: { message?: string } }).data?.message || "Failed to analyze feedback";
  } finally {
    analyzing.value = false;
  }
};

// Handle user selection
const handleUserSelected = (user: { id: string }) => {
  selectedUserId.value = user.id;
  fetchInsights(user.id);
};

// Expose method to select user from parent
const selectUser = (userId: string) => {
  selectedUserId.value = userId;
  fetchInsights(userId);
};

defineExpose({ selectUser });

// Chart data for sentiment donut
const chartData = computed(() => {
  if (!insights.value?.data?.sentimentData) return [];

  const sentiment = insights.value.data.sentimentData;
  return [
    { label: "Positive", value: sentiment.positive },
    { label: "Constructive", value: sentiment.constructive },
    { label: "Neutral", value: sentiment.neutral },
  ];
});

const colors = ["#10b981", "#f59e0b", "#6b7280"]; // green, amber, gray

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const template = (d: { label: string; value: number }) => {
  return `
    <div style="padding: 8px;">
      <div style="font-weight: 600; margin-bottom: 4px; text-transform: capitalize;">${d.label}</div>
      <div style="color: rgb(59, 130, 246);">${d.value}%</div>
    </div>
  `;
};

// Get sentiment color class
const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case "positive":
      return "text-green-500";
    case "constructive":
      return "text-amber-500";
    default:
      return "text-gray-500";
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          User Sentiment Analysis
        </h3>
        <UIcon
          name="i-heroicons-sparkles"
          class="text-purple-500 text-xl"
        />
      </div>
    </template>

    <div class="space-y-4">
      <!-- User Selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select User
        </label>
        <AdminUserSelector
          v-model="selectedUserId"
          placeholder="Choose a user to analyze..."
          @user-selected="handleUserSelected"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-48">
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin text-4xl text-gray-400"
        />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4"
      >
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <!-- No User Selected -->
      <div
        v-else-if="!selectedUserId"
        class="flex flex-col items-center justify-center h-48 text-gray-400"
      >
        <UIcon name="i-heroicons-user-circle" class="text-4xl mb-2" />
        <p class="text-sm">Select a user to view their sentiment analysis</p>
      </div>

      <!-- No Analysis Available -->
      <div
        v-else-if="insights && !insights.hasAnalysis"
        class="flex flex-col items-center justify-center h-48"
      >
        <UIcon
          name="i-heroicons-chart-bar"
          class="text-4xl text-gray-400 mb-2"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ insights.message }}
        </p>
        <UButton
          color="primary"
          :loading="analyzing"
          @click="triggerAnalysis"
        >
          <UIcon name="i-heroicons-sparkles" class="mr-1" />
          Analyze Now
        </UButton>
      </div>

      <!-- Analysis Results -->
      <div v-else-if="insights?.hasAnalysis && insights.data">
        <!-- Header with last analyzed -->
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-900 dark:text-white">
              {{ insights.userName }}
            </span>
            <span class="mx-2">&bull;</span>
            {{ insights.feedbackCount }} feedback items
          </div>
          <div class="flex items-center gap-2">
            <span
              v-if="insights.newFeedbackSinceAnalysis && insights.newFeedbackSinceAnalysis > 0"
              class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full"
            >
              {{ insights.newFeedbackSinceAnalysis }} new
            </span>
            <UButton
              size="xs"
              variant="ghost"
              :loading="analyzing"
              @click="triggerAnalysis"
            >
              <UIcon name="i-heroicons-arrow-path" />
            </UButton>
          </div>
        </div>

        <!-- Sentiment Donut Chart -->
        <div class="flex items-center gap-6">
          <div class="h-32 w-32 flex-shrink-0">
            <VisSingleContainer :data="chartData" :height="128">
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

          <!-- Legend -->
          <div class="flex-1 space-y-2">
            <div
              v-for="(item, index) in chartData"
              :key="item.label"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: colors[index] }"
                />
                <span class="text-gray-700 dark:text-gray-300">
                  {{ item.label }}
                </span>
              </div>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ item.value }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Top Themes -->
        <div v-if="insights.data.themes?.length" class="mt-6">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Top Themes
          </h4>
          <div class="space-y-2">
            <div
              v-for="theme in insights.data.themes.slice(0, 3)"
              :key="theme.theme"
              class="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="getSentimentColor(theme.sentiment)"
                  :style="{ backgroundColor: 'currentColor' }"
                />
                <span class="text-gray-900 dark:text-white">
                  {{ theme.theme }}
                </span>
              </div>
              <span class="text-gray-500">{{ theme.count }} mentions</span>
            </div>
          </div>
        </div>

        <!-- Last Analyzed -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-400">
            Last analyzed: {{ formatDate(insights.lastAnalyzed!) }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
