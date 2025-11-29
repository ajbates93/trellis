<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Feedback by Role
        </h3>
        <UIcon name="i-heroicons-chart-pie" class="text-primary text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-4xl text-gray-400"
      />
    </div>

    <div
      v-else-if="error"
      class="flex items-center justify-center h-64 text-red-500"
    >
      <p>Failed to load distribution data</p>
    </div>

    <div v-else>
      <div class="h-64 flex items-center justify-center">
        <VisSingleContainer :data="chartData" :height="256">
          <VisDonut
            :value="(d: any) => d.value"
            :angle-range="[0, 2 * Math.PI]"
            :pad-angle="0.02"
            :corner-radius="4"
          />
          <VisTooltip :template="template" />
        </VisSingleContainer>
      </div>

      <div class="mt-4 space-y-2">
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
            <span class="text-gray-700 dark:text-gray-300 capitalize">{{
              item.label
            }}</span>
          </div>
          <span class="font-medium text-gray-900 dark:text-white">{{
            item.value
          }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip } from "@unovis/vue";

const loading = ref(true);
const error = ref(false);
const chartData = ref<Array<{ label: string; value: number }>>([]);

const colors = ["#3b82f6", "#10b981", "#f59e0b", "#A6CC74"]; // blue, green, amber

const template = (d: any) => {
  return `
    <div style="padding: 8px;">
      <div style="font-weight: 600; margin-bottom: 4px; text-transform: capitalize;">${d.label}</div>
      <div style="color: rgb(59, 130, 246);">Feedback: ${d.value}</div>
    </div>
  `;
};

onMounted(async () => {
  try {
    const data = await $fetch("/api/admin/feedback-distribution");

    if (data) {
      chartData.value = Object.entries(data).map(([key, value]) => ({
        label: key,
        value: value as number,
      }));
    }
  } catch (e) {
    console.error("Failed to load feedback distribution:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
