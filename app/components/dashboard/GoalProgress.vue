<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Goals</h3>
      <NuxtLink to="/goals" class="text-xs text-teal-400 font-medium hover:text-teal-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <div v-if="pending" class="space-y-3.5 animate-pulse">
      <div v-for="n in 3" :key="n">
        <div class="flex justify-between items-center mb-1.5">
          <div class="h-3 bg-gray-800 rounded w-2/3" />
          <div class="h-2 bg-gray-800 rounded w-8" />
        </div>
        <div class="h-1.5 rounded-full bg-gray-800" />
      </div>
    </div>

    <div v-else-if="activeGoals.length === 0" class="text-sm text-gray-500 py-4 text-center">
      No active goals. <NuxtLink to="/goals" class="text-teal-400 hover:text-teal-300">Create one</NuxtLink>
    </div>

    <div v-else class="space-y-3.5">
      <div v-for="goal in activeGoals" :key="goal.id">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-[13px] text-white font-medium truncate pr-3">{{ goal.goalText }}</span>
          <span class="text-[11px] text-gray-500 flex-shrink-0">
            {{ goal.completedMilestones }}/{{ goal.totalMilestones }}
          </span>
        </div>
        <div class="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: `${goal.percent}%` }"
            :class="progressBarClass(goal.percent)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Goal {
  id: string
  goalText: string
  status: string | null
  milestones: Array<{ isCompleted: boolean | null }>
}

interface Props {
  goals: Goal[]
  pending?: boolean
}

const props = withDefaults(defineProps<Props>(), { pending: false })

const activeGoals = computed(() =>
  props.goals
    .filter(g => g.status === 'active')
    .map(g => {
      const total = g.milestones.length
      const completed = g.milestones.filter(m => m.isCompleted).length
      return {
        id: g.id,
        goalText: g.goalText,
        totalMilestones: total,
        completedMilestones: completed,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      }
    }),
)

function progressBarClass(percent: number): string {
  if (percent === 100) return 'bg-green-400'
  if (percent > 50) return 'bg-teal-400'
  return 'bg-gradient-to-r from-purple-400 to-teal-400'
}
</script>
