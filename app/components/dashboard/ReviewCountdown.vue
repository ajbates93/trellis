<template>
  <UCard class="bg-gray-900/50 border-gray-800 relative overflow-hidden">
    <!-- Subtle teal glow -->
    <div class="absolute -top-10 -right-10 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

    <div class="relative">
      <div class="flex justify-between items-start">
        <!-- Left: countdown -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-calendar-days" class="text-teal-400 text-sm" />
            <span class="text-xs font-semibold text-teal-400 uppercase tracking-wider">Next Review</span>
          </div>
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-5xl font-bold text-white tabular-nums leading-none">{{ daysUntilReview }}</span>
            <span class="text-base text-gray-400">days away</span>
          </div>
          <p class="text-sm text-gray-400">
            {{ formattedDate }}<template v-if="buddyName"> with {{ buddyName }}</template>
          </p>
        </div>

        <!-- Right: circular progress -->
        <div class="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" class="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke-width="6" class="stroke-gray-800" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              class="stroke-teal-400"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="circumference * (1 - prepPercent / 100)"
              style="transition: stroke-dashoffset 0.8s ease"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-lg font-bold text-white">{{ prepDone }}/{{ prepItems.length }}</span>
            <span class="text-[10px] text-gray-500">ready</span>
          </div>
        </div>
      </div>

      <!-- Prep checklist -->
      <div class="mt-5 space-y-1.5">
        <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Prepare for your review
        </span>
        <NuxtLink
          v-for="item in prepItems"
          :key="item.label"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
          :class="item.done ? 'bg-teal-900/20' : 'hover:bg-gray-800'"
        >
          <UIcon
            v-if="item.done"
            name="i-heroicons-check-circle"
            class="text-teal-400 text-base flex-shrink-0"
          />
          <div
            v-else
            class="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <span
              class="text-[13px] block"
              :class="item.done ? 'text-teal-400/85' : 'text-white'"
            >
              {{ item.label }}
            </span>
            <span class="text-[11px] text-gray-500">{{ item.detail }}</span>
          </div>
          <UIcon
            v-if="!item.done"
            name="i-heroicons-chevron-right"
            class="text-gray-600 text-sm flex-shrink-0"
          />
        </NuxtLink>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Goal {
  id: string
  status: string | null
  updatedAt: Date | string
  milestones: Array<{ isCompleted: boolean | null }>
}

interface Props {
  daysUntilReview: number
  reviewDate: string | null
  buddyName: string | null
  unreadCount: number
  goals: Goal[]
  achievementsCount: number
}

const props = defineProps<Props>()

const circumference = 2 * Math.PI * 34

const formattedDate = computed(() => {
  if (!props.reviewDate) return ''
  const date = new Date(props.reviewDate)
  return date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })
})

const feedbackReviewed = computed(() => props.unreadCount === 0)

const goalsUpdated = computed(() => {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  return props.goals
    .filter(g => g.status === 'active')
    .some(g => new Date(g.updatedAt) >= fourteenDaysAgo)
})

const bragBucketFresh = computed(() => props.achievementsCount > 0)

const prepItems = computed(() => [
  {
    label: 'Review your recent feedback',
    done: feedbackReviewed.value,
    detail: feedbackReviewed.value
      ? 'All caught up'
      : `${props.unreadCount} unread`,
    to: '/feedback/inbox',
  },
  {
    label: 'Update your goals',
    done: goalsUpdated.value,
    detail: `${props.goals.filter(g => g.status === 'active').length} active goals`,
    to: '/goals',
  },
  {
    label: 'Add to your brag bucket',
    done: bragBucketFresh.value,
    detail: bragBucketFresh.value
      ? 'Have wins ready to discuss'
      : 'Add recent achievements',
    to: '/brag-bucket',
  },
])

const prepDone = computed(() => prepItems.value.filter(p => p.done).length)
const prepPercent = computed(() =>
  Math.round((prepDone.value / prepItems.value.length) * 100),
)
</script>
