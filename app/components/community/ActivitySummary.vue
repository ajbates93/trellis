<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Team Activity
        </h3>
        <div class="flex items-center gap-2">
          <USelect
            v-model="selectedPeriod"
            :items="periodOptions"
            size="xs"
            class="w-32"
          />
          <UIcon name="i-heroicons-chart-bar" class="text-teal-500 text-xl" />
        </div>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-32">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-32 text-red-500">
      <p>Failed to load activity</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Feedback submitted -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="text-teal-600 dark:text-teal-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Feedback submitted</p>
        </div>
        <p class="text-2xl font-bold text-teal-600 dark:text-teal-400">{{ summary.feedbackSubmitted }}</p>
      </div>

      <!-- vs previous period -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-arrow-trending-up" class="text-purple-600 dark:text-purple-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">vs previous period</p>
        </div>
        <p class="text-2xl font-bold" :class="changeColor">{{ changeLabel }}</p>
      </div>

      <!-- Participation rate -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-users" class="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Participation rate</p>
        </div>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ summary.participationRate.active }}<span class="text-sm font-normal ml-1">of {{ summary.participationRate.total }}</span>
        </p>
      </div>

      <!-- Longest streak -->
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

      <!-- Most connected -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-globe-alt" class="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Most connected</p>
            <p v-if="summary.mostConnected" class="text-xs text-gray-400 dark:text-gray-500">
              {{ summary.mostConnected.name }}
            </p>
          </div>
        </div>
        <p v-if="summary.mostConnected" class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {{ summary.mostConnected.connectionCount }}<span class="text-sm font-normal ml-1">people</span>
        </p>
        <p v-else class="text-sm text-gray-400">—</p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const periodOptions = [
  { label: 'This week', value: 'this-week' },
  { label: 'Last 7 days', value: 'last-7-days' },
  { label: 'Last 30 days', value: 'last-30-days' },
  { label: 'All time', value: 'all-time' },
]

const selectedPeriod = ref('this-week')

interface ActivitySummary {
  feedbackSubmitted: number
  previousPeriodCount: number
  periodChange: number
  participationRate: { active: number; total: number }
  uniquePairs: number
  longestActiveStreak: number
  streakHolder: { name: string; avatarUrl: string | null } | null
  mostConnected: { name: string; avatarUrl: string | null; connectionCount: number } | null
}

const loading = ref(true)
const error = ref(false)
const summary = ref<ActivitySummary>({
  feedbackSubmitted: 0,
  previousPeriodCount: 0,
  periodChange: 0,
  participationRate: { active: 0, total: 0 },
  uniquePairs: 0,
  longestActiveStreak: 0,
  streakHolder: null,
  mostConnected: null,
})

const changeLabel = computed(() => {
  const c = summary.value.periodChange
  if (c > 0) return `+${c}`
  if (c < 0) return `${c}`
  return '0'
})

const changeColor = computed(() => {
  const c = summary.value.periodChange
  if (c > 0) return 'text-green-600 dark:text-green-400'
  if (c < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
})

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const data = await $fetch('/api/community/activity-summary', {
      params: { period: selectedPeriod.value },
    })
    if (data) summary.value = data
  } catch (e) {
    console.error('Failed to load activity summary:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(selectedPeriod, fetchData)
</script>
