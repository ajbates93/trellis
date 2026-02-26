<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Team Activity
        </h3>
        <UIcon name="i-heroicons-chart-bar" class="text-teal-500 text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-32">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-32 text-red-500">
      <p>Failed to load activity</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Stat: Feedback this week -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Feedback this week</p>
          </div>
        </div>
        <p class="text-2xl font-bold text-teal-600 dark:text-teal-400">{{ summary.totalFeedbackThisWeek }}</p>
      </div>

      <!-- Stat: Participation rate -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-users" class="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Participation rate</p>
          </div>
        </div>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ summary.activeContributors }}<span class="text-sm font-normal ml-1">of {{ summary.totalWorkspaceUsers }}</span>
        </p>
      </div>

      <!-- Stat: Week-over-week change -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-arrow-trending-up" class="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">vs last week</p>
          </div>
        </div>
        <p class="text-2xl font-bold" :class="weekChangeColor">
          {{ weekChangeLabel }}
        </p>
      </div>

      <!-- Stat: Avg feedback per contributor -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-chart-bar-square" class="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Avg per contributor</p>
          </div>
        </div>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ summary.avgFeedbackPerContributor }}</p>
      </div>

      <!-- Stat: Active contributors -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-user-group" class="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Active contributors</p>
          </div>
        </div>
        <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ summary.activeContributors }}</p>
      </div>

      <!-- Stat: Longest streak -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-fire" class="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Longest streak</p>
            <p v-if="summary.streakHolder" class="text-xs text-gray-400 dark:text-gray-500">
              {{ summary.streakHolder.name }}
            </p>
          </div>
        </div>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {{ summary.longestActiveStreak }}<span class="text-sm font-normal ml-1">weeks</span>
        </p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface ActivitySummaryData {
  totalFeedbackThisWeek: number
  activeContributors: number
  longestActiveStreak: number
  streakHolder: { name: string; avatarUrl: string | null } | null
  totalWorkspaceUsers: number
  lastWeekFeedbackCount: number
  weekOverWeekChange: number
  avgFeedbackPerContributor: number
}

const loading = ref(true)
const error = ref(false)
const summary = ref<ActivitySummaryData>({
  totalFeedbackThisWeek: 0,
  activeContributors: 0,
  longestActiveStreak: 0,
  streakHolder: null,
  totalWorkspaceUsers: 0,
  lastWeekFeedbackCount: 0,
  weekOverWeekChange: 0,
  avgFeedbackPerContributor: 0,
})

const weekChangeLabel = computed(() => {
  const change = summary.value.weekOverWeekChange
  if (change > 0) return `+${change}`
  if (change < 0) return `${change}`
  return '0'
})

const weekChangeColor = computed(() => {
  const change = summary.value.weekOverWeekChange
  if (change > 0) return 'text-green-600 dark:text-green-400'
  if (change < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
})

onMounted(async () => {
  try {
    const data = await $fetch('/api/community/activity-summary')
    if (data) {
      summary.value = data
    }
  } catch (e) {
    console.error('Failed to load activity summary:', e)
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>
