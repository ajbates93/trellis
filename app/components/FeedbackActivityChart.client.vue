<script setup lang="ts">
import { format } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import { useElementSize } from '@vueuse/core'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

type DataRecord = {
  date: Date
  given: number
  received: number
}

const { width } = useElementSize(cardRef)

const data = ref<DataRecord[]>([])

// Fetch real data from API
const fetchData = async () => {
  try {
    const response = await $fetch<{ timeline: DataRecord[] }>('/api/analytics/feedback-timeline')
    // Parse date strings back into Date objects (JSON serialization converts them to strings)
    data.value = response.timeline.map(d => ({
      ...d,
      date: new Date(d.date),
    }))
  } catch (error) {
    console.error('Failed to fetch feedback timeline:', error)
    // Fallback to empty data if fetch fails
    data.value = []
  }
}

onMounted(() => {
  fetchData()
})

const x = (_: DataRecord, i: number) => i
const yGiven = (d: DataRecord) => d.given
const yReceived = (d: DataRecord) => d.received

const totalGiven = computed(() => data.value.reduce((acc: number, { given }) => acc + given, 0))
const totalReceived = computed(() => data.value.reduce((acc: number, { received }) => acc + received, 0))

const formatDate = (date: Date): string => {
  return format(date, 'd MMM')
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => {
  if (!d?.date) return ''
  return `
    <div style="padding: 8px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${formatDate(d.date)}</div>
      <div style="color: rgb(16, 185, 129);">Given: ${d.given}</div>
      <div style="color: rgb(59, 130, 246);">Received: ${d.received}</div>
    </div>
  `
}
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Feedback Activity
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Last 12 weeks
          </p>
        </div>
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-green-500" />
            <span class="text-gray-600 dark:text-gray-400">Given: {{ totalGiven }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-blue-500" />
            <span class="text-gray-600 dark:text-gray-400">Received: {{ totalReceived }}</span>
          </div>
        </div>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-64"
      :width="width"
    >
      <!-- Given feedback line -->
      <VisLine
        :x="x"
        :y="yGiven"
        color="rgb(16, 185, 129)"
      />
      <VisArea
        :x="x"
        :y="yGiven"
        color="rgb(16, 185, 129)"
        :opacity="0.1"
      />

      <!-- Received feedback line -->
      <VisLine
        :x="x"
        :y="yReceived"
        color="rgb(59, 130, 246)"
      />
      <VisArea
        :x="x"
        :y="yReceived"
        color="rgb(59, 130, 246)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
