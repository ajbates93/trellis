<template>
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-white">
      {{ greeting }}, {{ displayName }}
    </h1>
    <p class="mt-1 text-sm sm:text-base text-gray-400">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  userName: string | null
  daysUntilReview: number | null
  buddyName: string | null
  unreadCount: number
}

const props = defineProps<Props>()

const greeting = computed(() => {
  if (!import.meta.client) return 'Welcome back'
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => props.userName || 'there')

const subtitle = computed(() => {
  if (props.daysUntilReview !== null && props.daysUntilReview <= 30) {
    const withBuddy = props.buddyName ? ` with ${props.buddyName}` : ''
    return `Your review${withBuddy} is in ${props.daysUntilReview} days. Here's where you stand.`
  }
  if (props.unreadCount > 0) {
    return `You have ${props.unreadCount} unread feedback waiting for you.`
  }
  return "Here's your week at a glance."
})
</script>
