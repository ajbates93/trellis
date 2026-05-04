<template>
  <UCard class="bg-default/50 border-default">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-highlighted">Feedback Pulse</h3>
      <UIcon name="i-heroicons-chart-bar" class="text-teal-600 dark:text-teal-400 text-lg" />
    </div>

    <div v-if="pending" class="h-48 flex items-end gap-2 px-1 animate-pulse">
      <div
        v-for="(h, i) in skeletonHeights"
        :key="i"
        class="flex-1 bg-elevated rounded-sm"
        :style="{ height: h + '%' }"
      />
    </div>

    <div v-else-if="weeks.length === 0" class="text-sm text-dimmed py-8 text-center">
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
    <div v-if="weeks.length > 0" class="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-default">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-teal-400" />
          <span class="text-[11px] text-muted">Given</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-purple-400" />
          <span class="text-[11px] text-muted">Received</span>
        </div>
      </div>
      <span class="text-[11px] text-dimmed">x-axis: week commencing (dd/mm)</span>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisCrosshair } from "@unovis/vue";
import { useElementSize } from "@vueuse/core";
import { format } from "date-fns";

interface WeekData {
  week: string
  given: number
  received: number
}

interface Props {
  weeks: WeekData[]
  pending?: boolean
}

const props = withDefaults(defineProps<Props>(), { pending: false })

// Static heights for skeleton bars so SSR and client match
const skeletonHeights = [35, 55, 40, 70, 50, 65, 45, 60, 75, 50, 65, 55]

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

// Convert an ISO week string like "2026-W14" to the Monday of that week (UTC).
function isoWeekMonday(weekStr: string): Date | null {
  const match = weekStr.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  // ISO week 1 is the week containing Jan 4.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7 // Sun=0 → treat as 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1)
  const target = new Date(week1Monday)
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return target
}

const formatWeekLabel = (i: number) => {
  const week = props.weeks[i]?.week
  if (!week) return ""
  const monday = isoWeekMonday(week)
  return monday ? format(monday, "dd/MM") : week
}

const tooltipTemplate = (d: ChartDatum) => {
  const monday = isoWeekMonday(d.week)
  const heading = monday ? `w/c ${format(monday, "d MMM yyyy")}` : d.week
  return `
    <div style="padding: 8px; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 4px;">${heading}</div>
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
