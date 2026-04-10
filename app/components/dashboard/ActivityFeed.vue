<template>
  <UCard class="bg-gray-900/50 border-gray-800">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-[15px] font-semibold text-white">Recent Activity</h3>
      <NuxtLink to="/feedback/inbox" class="text-xs text-teal-400 font-medium hover:text-teal-300">
        View all &rarr;
      </NuxtLink>
    </div>

    <div v-if="activities.length === 0" class="text-sm text-gray-500 py-4 text-center">
      No activity yet. <NuxtLink to="/feedback/give" class="text-teal-400 hover:text-teal-300">Submit your first feedback</NuxtLink> to get started.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start gap-3"
      >
        <!-- Icon -->
        <div
          class="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          :class="iconBgClass(activity.type)"
        >
          <UIcon :name="iconName(activity.type)" class="text-sm" :class="iconColorClass(activity.type)" />
        </div>

        <!-- Content -->
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
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Activity {
  id: string
  type: 'feedback_received' | 'feedback_given'
  description: string
  personName: string
  isRead: boolean | null
  createdAt: string
}

interface Props {
  activities: Activity[]
}

defineProps<Props>()

function iconName(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'i-heroicons-chat-bubble-left-right'
    : 'i-heroicons-paper-airplane'
}

function iconBgClass(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'bg-teal-900/30'
    : 'bg-blue-900/30'
}

function iconColorClass(type: Activity['type']): string {
  return type === 'feedback_received'
    ? 'text-teal-400'
    : 'text-blue-400'
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
