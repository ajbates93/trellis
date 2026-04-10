<template>
  <UCard class="bg-gray-900/50 border-gray-800 relative overflow-hidden">
    <!-- Amber glow for active streaks -->
    <div
      v-if="streak > 0"
      class="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"
    />

    <div class="relative">
      <div class="flex items-center gap-2 mb-3">
        <UIcon name="i-heroicons-fire" class="text-amber-400 text-sm" />
        <span class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Streak</span>
      </div>

      <!-- Active streak -->
      <template v-if="streak > 0">
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-4xl font-bold text-white tabular-nums leading-none">{{ streak }}</span>
          <span class="text-sm text-gray-400">{{ streak === 1 ? 'week' : 'weeks' }}</span>
        </div>
        <p class="text-[13px] text-gray-400">
          {{ streakMessage }}
        </p>
      </template>

      <!-- No streak -->
      <template v-else>
        <p class="text-[13px] text-gray-400">
          Start your streak — <NuxtLink to="/feedback/give" class="text-amber-400 hover:text-amber-300">submit feedback</NuxtLink> this week.
        </p>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  streak: number
}

const props = defineProps<Props>()

const streakMessage = computed(() => {
  if (props.streak >= 8) return "Incredible consistency! Keep it going."
  if (props.streak >= 4) return "You've given feedback every week this month."
  return "You're building a great habit!"
})
</script>
