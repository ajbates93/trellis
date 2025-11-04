<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'

// Mock sentiment data - will be replaced with real AI analysis in Phase 8
const sentimentData = [
  { category: 'Positive', value: 60, color: '#10B981' }, // green-500
  { category: 'Constructive', value: 30, color: '#F59E0B' }, // amber-500
  { category: 'Neutral', value: 10, color: '#6B7280' }, // gray-500
]

const value = (d: typeof sentimentData[0]) => d.value
const color = (d: typeof sentimentData[0]) => d.color

// Mock theme data
const themes = [
  {
    name: 'Communication Skills',
    count: 12,
    sentiment: 'positive',
    icon: '🟢',
  },
  {
    name: 'Technical Documentation',
    count: 8,
    sentiment: 'constructive',
    icon: '🟡',
  },
  {
    name: 'Code Quality',
    count: 7,
    sentiment: 'positive',
    icon: '🟢',
  },
  {
    name: 'Team Collaboration',
    count: 5,
    sentiment: 'positive',
    icon: '🟢',
  },
]

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
</script>

<template>
  <UCard :ui="{ body: '!p-6' }">
    <template #header>
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Feedback Insights
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            AI-powered sentiment analysis (Preview)
          </p>
        </div>
      </div>
    </template>

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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
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

        <!-- Coming Soon Note -->
        <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-sparkles"
              class="text-primary text-xl flex-shrink-0 mt-0.5"
            />
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                AI-powered insights coming soon
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Phase 8 will introduce automated theme detection, trend
                analysis, and goal suggestions based on your feedback patterns.
              </p>
            </div>
          </div>
        </div>
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
