<script setup lang="ts">
const goals = [
  { label: 'Lead retro sessions', progress: 75 },
  { label: 'Improve code reviews', progress: 40 },
  { label: 'Mentor junior devs', progress: 90 },
]
</script>

<template>
  <div class="bg-white rounded-2xl shadow-lg shadow-[#064e3b]/5 p-5 w-48 flex-shrink-0 hidden md:block">
    <p class="text-xs font-semibold text-[#10b981] uppercase tracking-wider mb-3">Active Goals</p>
    <div class="space-y-2.5">
      <div v-for="goal in goals" :key="goal.label">
        <div class="flex justify-between text-[11px] mb-1">
          <span class="font-medium text-[#065f46]">{{ goal.label }}</span>
          <span class="text-[#10b981]">{{ goal.progress }}%</span>
        </div>
        <div class="h-1.5 bg-[#d1fae5] rounded-full">
          <div class="h-1.5 bg-[#10b981] rounded-full" :style="{ width: `${goal.progress}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
