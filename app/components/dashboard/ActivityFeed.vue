<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="mb-4">
      <h3 class="text-[15px] font-semibold text-white">Recent Activity</h3>
    </div>

    <div v-if="activities.length === 0" class="text-sm text-gray-500 py-4 text-center">
      No activity yet. <NuxtLink to="/feedback/give" class="text-teal-400 hover:text-teal-300">Submit your first feedback</NuxtLink> to get started.
    </div>

    <div v-else class="space-y-3 max-h-[338px] overflow-y-auto -mr-2 pr-2">
      <template v-for="activity in activities" :key="activity.id">
        <NuxtLink
          v-if="activity.href"
          :to="activity.href"
          class="flex items-start gap-3 hover:bg-gray-800/40 -mx-2 px-2 py-1 rounded transition-colors"
        >
          <div
            class="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            :class="iconBgClass(activity.type)"
          >
            <UIcon :name="iconName(activity.type)" class="text-sm" :class="iconColorClass(activity.type)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-[13px] text-gray-300 truncate">{{ activity.description }}</p>
              <span
                v-if="activity.type === 'feedback_received' && activity.isRead === false"
                class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-teal-400"
              />
            </div>
            <p class="text-[11px] text-gray-500 mt-0.5">{{ formatRelativeTime(activity.createdAt) }}</p>
          </div>
        </NuxtLink>

        <div v-else class="flex items-start gap-3">
          <div
            class="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            :class="iconBgClass(activity.type)"
          >
            <UIcon :name="iconName(activity.type)" class="text-sm" :class="iconColorClass(activity.type)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-[13px] text-gray-300 truncate">{{ activity.description }}</p>
              <span
                v-if="activity.type === 'feedback_received' && activity.isRead === false"
                class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-teal-400"
              />
            </div>
            <p class="text-[11px] text-gray-500 mt-0.5">{{ formatRelativeTime(activity.createdAt) }}</p>
          </div>
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
type ActivityType =
  | 'feedback_received'
  | 'feedback_given'
  | 'goal_milestone'
  | 'brag_bucket'
  | 'buddy_feedback'
  | 'review_completed'

interface Activity {
  id: string
  type: ActivityType
  description: string
  href: string | null
  isRead: boolean | null
  createdAt: string
}

interface Props {
  activities: Activity[]
}

defineProps<Props>()

function iconName(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'i-heroicons-chat-bubble-left-right'
    case 'feedback_given':
      return 'i-heroicons-paper-airplane'
    case 'goal_milestone':
      return 'i-heroicons-flag'
    case 'brag_bucket':
      return 'i-heroicons-star'
    case 'buddy_feedback':
      return 'i-heroicons-paper-airplane'
    case 'review_completed':
      return 'i-heroicons-calendar-days'
  }
}

function iconBgClass(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'bg-teal-900/30'
    case 'feedback_given':
    case 'buddy_feedback':
      return 'bg-blue-900/30'
    case 'goal_milestone':
      return 'bg-purple-900/30'
    case 'brag_bucket':
      return 'bg-amber-900/30'
    case 'review_completed':
      return 'bg-green-900/30'
  }
}

function iconColorClass(type: ActivityType): string {
  switch (type) {
    case 'feedback_received':
      return 'text-teal-400'
    case 'feedback_given':
    case 'buddy_feedback':
      return 'text-blue-400'
    case 'goal_milestone':
      return 'text-purple-400'
    case 'brag_bucket':
      return 'text-amber-400'
    case 'review_completed':
      return 'text-green-400'
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
</script>
