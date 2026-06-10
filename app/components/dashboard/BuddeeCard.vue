<template>
  <UCard class="bg-default/50 border-default">
    <!-- Header: Avatar + Name + Status -->
    <div class="flex items-center gap-3 mb-3">
      <UAvatar :text="initials" :src="buddee.avatarUrl || undefined" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-highlighted truncate">{{ displayName }}</p>
        <p v-if="buddee.roleType" class="text-[11px] text-dimmed capitalize">{{ buddee.roleType }}</p>
      </div>
      <span
        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
        :class="statusClasses"
      >
        {{ statusLabel }}
      </span>
    </div>

    <!-- Metrics Row -->
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="bg-elevated/50 rounded-lg p-2 text-center">
        <p
          class="text-lg font-semibold tabular-nums"
          :class="buddee.feedbackToPublish > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-highlighted'"
        >
          {{ buddee.feedbackToPublish }}
        </p>
        <p class="text-[10px] text-dimmed">To publish</p>
      </div>
      <div class="bg-elevated/50 rounded-lg p-2 text-center">
        <p class="text-lg font-semibold text-highlighted tabular-nums">{{ buddee.feedbackReceived }}</p>
        <p class="text-[10px] text-dimmed">Received</p>
      </div>
      <div class="bg-elevated/50 rounded-lg p-2 text-center">
        <p class="text-lg font-semibold text-highlighted tabular-nums">{{ buddee.activeGoals }}</p>
        <p class="text-[10px] text-dimmed">Goals</p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <NuxtLink
        v-if="buddee.feedbackToPublish > 0"
        :to="`/buddies/feedback?buddy=${buddee.id}`"
        class="flex-1 inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
      >
        Review & publish
      </NuxtLink>
      <NuxtLink
        :to="`/buddies/${buddee.id}`"
        class="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium border border-muted text-toned hover:bg-elevated transition-colors"
        :class="buddee.feedbackToPublish > 0 ? '' : 'flex-1'"
      >
        View profile
      </NuxtLink>
    </div>
  </UCard>
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
  buddee: Buddee
}

const props = defineProps<Props>()

const displayName = computed(() => props.buddee.preferredName || props.buddee.name)

const initials = computed(() => {
  const name = props.buddee.name
  const parts = name.split(' ')
  return parts.length >= 2
    ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`
    : name.slice(0, 2)
})

const statusClasses = computed(() => {
  switch (props.buddee.status) {
    case 'review_soon':
      return 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
    case 'needs_attention':
      return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
    default:
      return 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20'
  }
})

const statusLabel = computed(() => {
  switch (props.buddee.status) {
    case 'review_soon':
      return `Review in ${props.buddee.nextReviewDays}d`
    case 'needs_attention':
      return 'Needs attention'
    default:
      return 'On track'
  }
})
</script>
