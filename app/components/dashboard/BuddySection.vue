<template>
  <div>
    <!-- Gradient Divider -->
    <div class="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6" />

    <!-- Section Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-user-group" class="text-purple-400 text-lg" />
        <h2 class="text-[15px] font-semibold text-white">Your Buddees</h2>
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-900/20 text-purple-400 border border-purple-500/20">
          {{ buddees.length }}
        </span>
      </div>
      <NuxtLink to="/buddies" class="text-xs text-purple-400 font-medium hover:text-purple-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <!-- Nudge Bar -->
    <div
      v-if="nudgeMessages.length > 0"
      class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 mb-4 flex items-start gap-2"
    >
      <UIcon name="i-heroicons-exclamation-circle" class="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
      <div class="text-sm text-purple-300 space-x-1">
        <span v-for="(msg, i) in nudgeMessages" :key="i" v-html="msg" />
      </div>
    </div>

    <!-- Buddee Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DashboardBuddeeCard
        v-for="buddee in displayedBuddees"
        :key="buddee.id"
        :buddee="buddee"
      />
    </div>

    <!-- Overflow link -->
    <p v-if="buddees.length > 3" class="text-xs text-gray-500 mt-3 text-center">
      <NuxtLink to="/buddies" class="text-purple-400 hover:text-purple-300">
        +{{ buddees.length - 3 }} more &rarr;
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
interface Buddee {
  id: string
  name: string
  preferredName: string | null
  avatarUrl: string | null
  roleType: string | null
  feedbackToPublish: number
  feedbackReceived: number
  activeGoals: number
  nextReviewDate: string | null
  nextReviewDays: number | null
  status: 'on_track' | 'needs_attention' | 'review_soon'
}

interface Props {
  buddees: Buddee[]
  totalFeedbackToPublish: number
}

const props = defineProps<Props>()

const displayedBuddees = computed(() => props.buddees.slice(0, 3))

const nudgeMessages = computed(() => {
  const messages: string[] = []

  if (props.totalFeedbackToPublish > 0) {
    messages.push(
      `You have <strong>${props.totalFeedbackToPublish} feedback</strong> waiting to be published.`,
    )
  }

  const reviewSoonBuddees = props.buddees.filter(b => b.status === 'review_soon')
  for (const b of reviewSoonBuddees) {
    const name = b.preferredName || b.name
    messages.push(
      `<strong>${name}</strong>'s review is in ${b.nextReviewDays} days.`,
    )
  }

  return messages
})
</script>
