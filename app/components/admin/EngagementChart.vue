<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Feedback Activity (12 Weeks)
        </h3>
        <UIcon name="i-heroicons-chart-bar" class="text-primary text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-64 text-red-500">
      <p>Failed to load engagement data</p>
    </div>

    <div v-else class="h-64">
      <VisXYContainer :data="chartData" :height="256">
        <VisArea
          :x="(d: any) => d.index"
          :y="(d: any) => d.count"
          color="#3b82f6"
          :opacity="0.2"
        />
        <VisLine
          :x="(d: any) => d.index"
          :y="(d: any) => d.count"
          color="#3b82f6"
          :line-width="3"
        />
        <VisScatter
          :x="(d: any) => d.index"
          :y="(d: any) => d.count"
          color="#3b82f6"
          :size="6"
        />
        <VisAxis
          type="x"
          :tick-format="(i: number) => weeks[i] || ''"
          :num-ticks="12"
        />
        <VisAxis type="y" :tick-format="(d: number) => d.toString()" />
        <VisTooltip />
      </VisXYContainer>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisScatter, VisAxis, VisTooltip } from "@unovis/vue";

const loading = ref(true);
const error = ref(false);
const weeks = ref<string[]>([]);
const chartData = ref<Array<{ index: number; count: number; week: string }>>([]);

onMounted(async () => {
  try {
    const data = await $fetch("/api/admin/engagement");

    if (data) {
      weeks.value = data.timeline.map((item: any) => item.week);
      chartData.value = data.timeline.map((item: any, index: number) => ({
        index,
        count: item.count,
        week: item.week,
      }));
    }
  } catch (e) {
    console.error("Failed to load engagement data:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
