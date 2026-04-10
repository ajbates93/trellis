<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex items-center gap-2 mb-4">
      <UIcon name="i-heroicons-sparkles" class="text-teal-400 text-lg" />
      <h3 class="text-[15px] font-semibold text-white">Feedback Themes</h3>
    </div>

    <!-- Empty state -->
    <div v-if="!hasAnalysis" class="text-sm text-gray-500 py-4 text-center">
      Not enough feedback for insights yet.
      <NuxtLink to="/insights" class="text-teal-400 hover:text-teal-300">Learn more</NuxtLink>
    </div>

    <template v-else>
      <!-- Sentiment bar -->
      <div v-if="sentiment" class="mb-4">
        <div class="flex h-2 rounded-full overflow-hidden mb-2">
          <div
            class="bg-teal-400"
            :style="{ width: `${sentiment.positive}%` }"
          />
          <div
            class="bg-amber-400"
            :style="{ width: `${sentiment.constructive}%` }"
          />
          <div
            class="bg-gray-600"
            :style="{ width: `${sentiment.neutral}%` }"
          />
        </div>
        <div class="flex justify-between text-[11px] text-gray-500">
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 mr-1" />
            Positive {{ sentiment.positive }}%
          </span>
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
            Constructive {{ sentiment.constructive }}%
          </span>
          <span>
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 mr-1" />
            Neutral {{ sentiment.neutral }}%
          </span>
        </div>
      </div>

      <!-- Theme tags -->
      <div v-if="themes.length > 0" class="flex flex-wrap gap-1.5">
        <span
          v-for="(theme, i) in themes"
          :key="i"
          class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
          :class="themeClasses[i % themeClasses.length]"
        >
          {{ theme }}
        </span>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
interface SentimentData {
  positive: number
  constructive: number
  neutral: number
}

interface Props {
  hasAnalysis: boolean
  sentiment: SentimentData | null
  themes: string[]
}

defineProps<Props>()

const themeClasses = [
  'bg-teal-900/20 text-teal-400 border-teal-500/20',
  'bg-purple-900/20 text-purple-400 border-purple-500/20',
  'bg-blue-900/20 text-blue-400 border-blue-500/20',
  'bg-amber-900/20 text-amber-400 border-amber-500/20',
  'bg-green-900/20 text-green-400 border-green-500/20',
] as const
</script>
