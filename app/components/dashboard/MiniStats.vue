<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <NuxtLink
      v-for="stat in visibleStats"
      :key="stat.label"
      :to="stat.to"
      class="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-colors"
    >
      <UIcon :name="stat.icon" class="text-base" :class="stat.iconClass" />
      <div>
        <span class="text-xl font-bold text-white leading-none">{{ stat.value }}</span>
        <p class="text-xs text-gray-500 mt-0.5">{{ stat.label }}</p>
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
interface Props {
  unreadCount: number
  incomingCount: number
  hasBuddies: boolean
  activeGoalsCount: number
  totalGoalsCount: number
  daysUntilReview: number | null
}

const props = defineProps<Props>()

const visibleStats = computed(() => {
  const stats: Array<{ label: string; value: string | number; icon: string; iconClass: string; to: string }> = [
    {
      label: 'Unread feedback',
      value: props.unreadCount,
      icon: 'i-heroicons-eye',
      iconClass: 'text-teal-400',
      to: '/feedback/inbox',
    },
  ]

  if (props.hasBuddies) {
    stats.push({
      label: 'Pending to publish',
      value: props.incomingCount,
      icon: 'i-heroicons-exclamation-circle',
      iconClass: 'text-amber-400',
      to: '/buddies/feedback',
    })
  } else {
    stats.push({
      label: props.daysUntilReview !== null ? 'Days to review' : 'No review scheduled',
      value: props.daysUntilReview !== null ? props.daysUntilReview : '-',
      icon: 'i-heroicons-calendar-days',
      iconClass: 'text-amber-400',
      to: '/reviews',
    })
  }

  stats.push({
    label: 'Goals on track',
    value: `${props.activeGoalsCount}/${props.totalGoalsCount}`,
    icon: 'i-heroicons-arrow-trending-up',
    iconClass: 'text-purple-400',
    to: '/goals',
  })

  return stats
})
</script>
