<template>
  <UDashboardPanel id="home">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-4xl mx-auto">
        <div ref="container" class="space-y-6">
          <!-- Header -->
          <div class="animate-item" :style="{ '--delay': '0ms' }">
            <DashboardHeader
              :user-name="user?.preferredName || user?.name?.split(' ')[0] || null"
              :days-until-review="daysUntilReview"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
            />
          </div>

          <!-- Quick Actions -->
          <div class="animate-item" :style="{ '--delay': '100ms' }">
            <DashboardQuickActions />
          </div>

          <!-- Mini Stats -->
          <div class="animate-item" :style="{ '--delay': '150ms' }">
            <DashboardMiniStats
              :unread-count="unreadCount"
              :incoming-count="incomingCount"
              :has-buddies="hasBuddies"
              :active-goals-count="activeGoalsCount"
              :total-goals-count="allGoals.length"
              :days-until-review="daysUntilReview"
            />
          </div>

          <!-- Onboarding Widget (existing, kept for new users) -->
          <div v-if="showOnboarding" class="animate-item flex justify-center" :style="{ '--delay': '200ms' }">
            <OnboardingWidget :is-static="true" />
          </div>

          <!-- Primary Row: Review Countdown + Goals Progress -->
          <div
            v-if="daysUntilReview !== null"
            class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <DashboardReviewCountdown
              :days-until-review="daysUntilReview"
              :review-date="nextReviewDate"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
              :goals="allGoals"
              :achievements-count="achievementsCount"
            />
            <DashboardGoalProgress :goals="allGoals" />
          </div>

          <!-- If no review scheduled, show GoalProgress full width -->
          <div
            v-else
            class="animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <DashboardGoalProgress :goals="allGoals" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Dashboard',
})

// Composables
const { user } = useAuth()
const { hasBuddies } = useBuddies()
const { unreadCount } = useUnreadCount()
const { incomingCount } = useIncomingFeedbackCount()
const { shouldShow: showOnboarding } = useOnboarding()

// API data
const { data: statsData } = await useFetch('/api/dashboard/stats')
const { data: goalsData } = await useFetch('/api/goals')
const { data: reviewsData } = await useFetch('/api/reviews/upcoming')
const { data: achievementsData } = await useFetch('/api/achievements')

// Computed values
const daysUntilReview = computed(() => statsData.value?.daysUntilReview ?? null)

const allGoals = computed(() => goalsData.value?.goals || [])

const activeGoalsCount = computed(
  () => allGoals.value.filter((g: { status: string | null }) => g.status === 'active').length,
)

const nextReview = computed(() => {
  const reviews = reviewsData.value?.reviews
  if (!reviews || reviews.length === 0) return null
  return reviews[0]
})

const nextReviewBuddyName = computed(() => nextReview.value?.buddy?.name || null)

const nextReviewDate = computed(() => nextReview.value?.scheduledDate || null)

const achievementsCount = computed(() => achievementsData.value?.achievements?.length || 0)
</script>

<style scoped>
.animate-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
