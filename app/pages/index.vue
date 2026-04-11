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

          <!-- NEW: Primary Row: Review Countdown (or empty state) + Activity Feed -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-item"
            :style="{ '--delay': '250ms' }"
          >
            <DashboardReviewCountdown
              v-if="daysUntilReview !== null"
              :days-until-review="daysUntilReview"
              :review-date="nextReviewDate"
              :buddy-name="nextReviewBuddyName"
              :unread-count="unreadCount"
              :goals="allGoals"
              :achievements-count="achievementsCount"
            />
            <UCard v-else class="bg-gray-900/50 border-gray-800 flex items-center justify-center">
              <div class="text-center py-6">
                <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/60 flex items-center justify-center">
                  <UIcon name="i-heroicons-calendar-days" class="text-gray-500 text-xl" />
                </div>
                <p class="text-sm font-medium text-gray-300 mb-1">No review scheduled</p>
                <p class="text-xs text-gray-500 mb-4">Your next review hasn't been booked yet.</p>
                <NuxtLink
                  to="/reviews"
                  class="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-teal-900/20 text-teal-400 border border-teal-500/20 hover:bg-teal-900/30 transition-colors"
                >
                  View reviews &rarr;
                </NuxtLink>
              </div>
            </UCard>
            <DashboardActivityFeed :activities="activities" />
          </div>

          <!-- NEW: Secondary Row: Streak Badge (narrow) + Feedback Pulse (wide) -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-item"
            :style="{ '--delay': '300ms' }"
          >
            <DashboardStreakBadge :streak="feedbackStreak" />
            <div class="md:col-span-2">
              <DashboardFeedbackPulse :weeks="pulseWeeks" />
            </div>
          </div>

          <!-- NEW: Tertiary Row: Goals Progress (was previously in primary row) -->
          <div class="animate-item" :style="{ '--delay': '350ms' }">
            <DashboardGoalProgress :goals="allGoals" />
          </div>

          <!-- Feedback Themes (full width) -->
          <div class="animate-item" :style="{ '--delay': '400ms' }">
            <DashboardFeedbackThemes
              :has-analysis="insightsHasAnalysis"
              :sentiment="insightsSentiment"
              :themes="insightsThemes"
            />
          </div>

          <!-- Buddy Section (conditional) -->
          <div v-if="hasBuddies" class="animate-item" :style="{ '--delay': '450ms' }">
            <DashboardBuddySection
              :buddees="buddySummary"
              :total-feedback-to-publish="totalFeedbackToPublish"
            />
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
const { data: activityData } = await useFetch('/api/dashboard/activity')
const { data: pulseData } = await useFetch('/api/dashboard/feedback-pulse')
const { data: buddySummaryData } = await useFetch('/api/buddies/dashboard-summary')
const { data: insightsData } = await useFetch('/api/insights/user-summary')

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

const feedbackStreak = computed(() => statsData.value?.feedbackStreak ?? 0)

const activities = computed(() => activityData.value?.activities || [])

const pulseWeeks = computed(() => pulseData.value?.weeks || [])

const buddySummary = computed(() => buddySummaryData.value?.buddees || [])
const totalFeedbackToPublish = computed(() => buddySummaryData.value?.totalFeedbackToPublish ?? 0)

const insightsHasAnalysis = computed(() => insightsData.value?.hasAnalysis === true)
const insightsSentiment = computed(() => insightsData.value?.data?.sentimentData ?? null)
const insightsThemes = computed(() => {
  const themes = insightsData.value?.data?.themes
  return Array.isArray(themes) ? themes : []
})
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
