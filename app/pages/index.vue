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
            <UCard v-if="statsPending" class="bg-gray-900/50 border-gray-800">
              <div class="animate-pulse space-y-4">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded bg-gray-800" />
                  <div class="h-3 w-24 bg-gray-800 rounded" />
                </div>
                <div class="h-12 w-20 bg-gray-800 rounded" />
                <div class="h-3 w-40 bg-gray-800 rounded" />
                <div class="space-y-2 pt-2">
                  <div class="h-8 bg-gray-800 rounded" />
                  <div class="h-8 bg-gray-800 rounded" />
                  <div class="h-8 bg-gray-800 rounded" />
                </div>
              </div>
            </UCard>
            <DashboardReviewCountdown
              v-else-if="daysUntilReview !== null"
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
            <DashboardActivityFeed :activities="activities" :pending="activityPending" />
          </div>

          <!-- NEW: Secondary Row: Streak Badge (narrow) + Feedback Pulse (wide) -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-item"
            :style="{ '--delay': '300ms' }"
          >
            <DashboardStreakBadge :streak="feedbackStreak" />
            <div class="md:col-span-2">
              <DashboardFeedbackPulse :weeks="pulseWeeks" :pending="pulsePending" />
            </div>
          </div>

          <!-- NEW: Tertiary Row: Goals Progress (was previously in primary row) -->
          <div class="animate-item" :style="{ '--delay': '350ms' }">
            <DashboardGoalProgress :goals="allGoals" :pending="goalsPending" />
          </div>

          <!-- Feedback Themes (full width) -->
          <div class="animate-item" :style="{ '--delay': '400ms' }">
            <DashboardFeedbackThemes
              :has-analysis="insightsHasAnalysis"
              :sentiment="insightsSentiment"
              :themes="insightsThemes"
              :pending="insightsPending"
            />
          </div>

          <!-- Buddy Section (conditional) -->
          <div v-if="hasBuddies" class="animate-item" :style="{ '--delay': '450ms' }">
            <DashboardBuddySection
              :buddees="buddySummary"
              :total-feedback-to-publish="totalFeedbackToPublish"
              :pending="buddySummaryPending"
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

// Surface a toast when redirected here by an access-denied guard
// (e.g. non-admin hitting /admin/*). See app/middleware/admin.global.ts.
const route = useRoute()
const router = useRouter()
onMounted(() => {
  if (route.query.denied === 'admin') {
    useToast().add({
      title: 'Access denied',
      description: 'Admin privileges are required for that page.',
      color: 'error',
      icon: 'i-heroicons-shield-exclamation',
    })
    // Clean up the URL so refresh doesn't re-toast.
    router.replace({ query: {} })
  }
})

// API data — all fetches are lazy so SSR returns immediately with the page shell
// and skeletons render while the data loads client-side
const { data: statsData, pending: statsPending } = useApi('/dashboard/stats', { lazy: true, default: () => null })
const { data: goalsData, pending: goalsPending } = useApi('/goals', { lazy: true, default: () => null })
const { data: reviewsData } = useApi('/reviews/upcoming', { lazy: true, default: () => null })
const { data: achievementsData } = useApi('/achievements', { lazy: true, default: () => null })
const { data: activityData, pending: activityPending } = useApi('/dashboard/activity', { lazy: true, default: () => null })
const { data: pulseData, pending: pulsePending } = useApi('/dashboard/feedback-pulse', { lazy: true, default: () => null })
const { data: buddySummaryData, pending: buddySummaryPending } = useApi('/buddies/dashboard-summary', { lazy: true, default: () => null })
const { data: insightsData, pending: insightsPending } = useApi('/insights/user-summary', { lazy: true, default: () => null })

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
