<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'

// Use real feedback insights
const {
  hasAnalysis,
  lastAnalyzed,
  sentimentData: rawSentimentData,
  themes: rawThemes,
  suggestedGoals,
  daysSinceAnalysis,
  canAnalyze,
  isAnalyzing,
  analyzeFeedback,
  newFeedbackCount,
  feedbackCount,
  totalPublishedFeedback,
} = useFeedbackInsights()

// Transform sentiment data for the donut chart
const sentimentData = computed(() => {
  if (!rawSentimentData.value) {
    return [
      { category: 'Positive', value: 60, color: '#10B981' },
      { category: 'Constructive', value: 30, color: '#F59E0B' },
      { category: 'Neutral', value: 10, color: '#6B7280' },
    ]
  }

  return [
    { category: 'Positive', value: rawSentimentData.value.positive, color: '#10B981' },
    { category: 'Constructive', value: rawSentimentData.value.constructive, color: '#F59E0B' },
    { category: 'Neutral', value: rawSentimentData.value.neutral, color: '#6B7280' },
  ]
})

// Transform themes for display
const themes = computed(() => {
  if (!rawThemes.value || rawThemes.value.length === 0) {
    return []
  }
  return rawThemes.value.map(theme => ({
    name: theme.theme,
    count: theme.count,
    sentiment: theme.sentiment,
    icon: theme.sentiment === 'positive' ? '🟢' : theme.sentiment === 'constructive' ? '🟡' : '⚪',
  }))
})

// Get active (non-dismissed) goal suggestions
const activeGoalSuggestions = computed(() => {
  if (!suggestedGoals.value) return []
  return suggestedGoals.value.filter(goal => !goal.dismissed)
})

const value = (d: any) => d.value
const color = (d: any) => d.color

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case 'positive':
      return 'primary'
    case 'constructive':
      return 'warning'
    case 'neutral':
      return 'neutral'
    default:
      return 'neutral'
  }
}

// Format last analyzed date
const lastAnalyzedText = computed(() => {
  if (!lastAnalyzed.value) return 'Never'
  const days = daysSinceAnalysis.value
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
})

// Handle creating a goal from suggestion
const router = useRouter()
const createGoalFromSuggestion = (goalText: string) => {
  router.push({
    path: '/goals',
    query: {
      suggested: 'true',
      text: goalText,
    },
  })
}
</script>

<template>
  <UCard :ui="{ body: '!p-6' }">
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Feedback Insights
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {{ hasAnalysis ? `AI-powered analysis of ${feedbackCount} feedback items` : 'AI-powered sentiment analysis' }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            v-if="newFeedbackCount > 0"
            :label="`${newFeedbackCount} new`"
            color="primary"
            size="xs"
          />
          <UButton
            v-if="totalPublishedFeedback >= 3"
            :loading="isAnalyzing"
            :disabled="!canAnalyze && hasAnalysis"
            size="sm"
            icon="i-heroicons-sparkles"
            @click="analyzeFeedback"
          >
            {{ hasAnalysis ? 'Refresh' : 'Analyze Now' }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-if="!hasAnalysis" class="text-center py-12">
      <UIcon
        name="i-heroicons-sparkles"
        class="text-gray-400 text-5xl mb-4 mx-auto"
      />
      <p class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No insights yet
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {{ totalPublishedFeedback >= 3
          ? 'Click "Analyze Now" to generate AI-powered insights from your feedback'
          : `You have ${totalPublishedFeedback} piece${totalPublishedFeedback !== 1 ? 's' : ''} of feedback. Collect at least 3 to unlock AI insights.`
        }}
      </p>
      <div v-if="totalPublishedFeedback < 3" class="mb-6">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center gap-1">
            <div
              v-for="i in 3"
              :key="i"
              class="w-3 h-3 rounded-full"
              :class="i <= totalPublishedFeedback ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'"
            />
          </div>
          <span class="text-xs text-gray-600 dark:text-gray-400">
            {{ totalPublishedFeedback }}/3 feedback needed
          </span>
        </div>
      </div>
      <UButton
        v-if="totalPublishedFeedback >= 3"
        :loading="isAnalyzing"
        size="lg"
        icon="i-heroicons-sparkles"
        @click="analyzeFeedback"
      >
        Analyze Now
      </UButton>
      <UButton
        v-else
        size="lg"
        disabled
        icon="i-heroicons-lock-closed"
      >
        Needs {{ 3 - totalPublishedFeedback }} More Feedback
      </UButton>
    </div>

    <!-- Analysis Results -->
    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Donut Chart Section -->
        <div class="flex flex-col items-center justify-center">
          <div class="relative w-64 h-64">
            <VisSingleContainer :data="sentimentData" class="w-full h-full">
              <VisDonut
                :value="value"
                :color="color"
                :central-label="'Overall'"
                :central-sub-label="'Sentiment'"
              />
            </VisSingleContainer>
          </div>

          <!-- Legend -->
          <div class="mt-6 space-y-2 w-full">
            <div
              v-for="item in sentimentData"
              :key="item.category"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ item.category }}
                </span>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">
                {{ item.value }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Themes Section -->
        <div class="flex flex-col">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Common Themes
          </h3>

          <div v-if="themes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <UCard
              v-for="theme in themes"
              :key="theme.name"
              :ui="{ body: '!p-4' }"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ theme.name }}
                  </p>
                  <div class="flex items-center gap-2 mt-2">
                    <UBadge
                      :label="`${theme.count} mentions`"
                      :color="getSentimentColor(theme.sentiment)"
                      size="xs"
                    />
                  </div>
                </div>
                <span class="text-2xl ml-2">{{ theme.icon }}</span>
              </div>
            </UCard>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            No themes identified
          </div>
        </div>
      </div>

      <!-- Goal Suggestions Section -->
      <div v-if="activeGoalSuggestions.length > 0" class="space-y-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
          Suggested Goals
        </h3>
        <UCard
          v-for="(goal, index) in activeGoalSuggestions"
          :key="index"
          :ui="{ body: '!p-4' }"
          class="border border-primary/20"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-light-bulb"
                  class="text-primary text-xl flex-shrink-0 mt-0.5"
                />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ goal.goalText }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Based on: {{ goal.basedOnTheme }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <UButton
                size="xs"
                icon="i-heroicons-flag"
                @click="createGoalFromSuggestion(goal.goalText)"
              >
                Create Goal
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Last Analyzed Info -->
      <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <span>Last analyzed: {{ lastAnalyzedText }}</span>
        <span v-if="!canAnalyze">You can analyze again tomorrow</span>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
:deep(.vis-single-container) {
  --vis-donut-central-label-font-size: 16px;
  --vis-donut-central-label-font-weight: 600;
  --vis-donut-central-sub-label-font-size: 12px;
  --vis-donut-central-label-color: var(--ui-text-highlighted);
  --vis-donut-central-sub-label-color: var(--ui-text-dimmed);
}
</style>
