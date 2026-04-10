<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Feedback Pulse</h3>
      <UIcon name="i-heroicons-chart-bar" class="text-teal-400 text-lg" />
    </div>

    <div v-if="weeks.length === 0" class="text-sm text-gray-500 py-8 text-center">
      Not enough data yet.
    </div>

    <div v-else ref="chartContainer" class="h-48 overflow-visible">
      <VisXYContainer :data="chartData" :height="192" :width="containerWidth" :padding="{ top: 10 }">
        <!-- Given (teal) -->
        <VisArea
          :x="x"
          :y="yGiven"
          color="#2dd4bf"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="yGiven"
          color="#2dd4bf"
          :line-width="2"
        />

        <!-- Received (purple) -->
        <VisArea
          :x="x"
          :y="yReceived"
          color="#a78bfa"
          :opacity="0.15"
        />
        <VisLine
          :x="x"
          :y="yReceived"
          color="#a78bfa"
          :line-width="2"
        />

        <VisAxis
          type="x"
          :tick-format="formatWeekLabel"
          :num-ticks="6"
        />
        <VisAxis type="y" :tick-format="(d: number) => d.toString()" />
        <VisCrosshair
          color="var(--ui-primary)"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>
    </div>

    <!-- Legend -->
    <div v-if="weeks.length > 0" class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-teal-400" />
        <span class="text-[11px] text-gray-400">Given</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-purple-400" />
        <span class="text-[11px] text-gray-400">Received</span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisCrosshair } from "@unovis/vue";
import { useElementSize } from "@vueuse/core";

interface WeekData {
  week: string
  given: number
  received: number
}

interface Props {
  weeks: WeekData[]
}

const props = defineProps<Props>()

const chartContainer = useTemplateRef<HTMLElement | null>("chartContainer");
const { width: containerWidth } = useElementSize(chartContainer);

interface ChartDatum {
  index: number
  given: number
  received: number
  week: string
}

const chartData = computed<ChartDatum[]>(() =>
  props.weeks.map((w, index) => ({
    index,
    given: w.given,
    received: w.received,
    week: w.week,
  }))
)

const x = (_: ChartDatum, i: number) => i
const yGiven = (d: ChartDatum) => d.given
const yReceived = (d: ChartDatum) => d.received

const formatWeekLabel = (i: number) => {
  const week = props.weeks[i]?.week
  if (!week) return ""
  // Show abbreviated: "W01", "W05", etc.
  const match = week.match(/W(\d+)/)
  return match ? `W${match[1]}` : week
}

const tooltipTemplate = (d: ChartDatum) => {
  return `
    <div style="padding: 8px; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${d.week}</div>
      <div style="color: #2dd4bf;">Given: ${d.given}</div>
      <div style="color: #a78bfa;">Received: ${d.received}</div>
    </div>
  `
}
</script>

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
