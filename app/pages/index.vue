<template>
  <UDashboardPanel id="home">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8 max-w-4xl mx-auto">
        <!-- Staggered animation container -->
        <div ref="container" class="space-y-8">
          <!-- Welcome header -->
          <div class="text-center animate-item" :style="{ '--delay': '0ms' }">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Welcome back,
              {{ user?.preferredName || user?.name?.split(" ")[0] || "there" }}
            </h1>
            <p class="mt-2 text-gray-500 dark:text-gray-400">
              What would you like to do today?
            </p>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-item" :style="{ '--delay': '100ms' }">
            <QuickStatCard :value="stats.feedbackThisWeek" label="Feedback This Week"
              icon="i-heroicons-chat-bubble-left-right" color="teal" />
            <QuickStatCard :value="stats.activeGoals" label="Active Goals" icon="i-heroicons-flag" color="purple" />
            <QuickStatCard :value="stats.daysUntilReview" :label="stats.daysUntilReview !== null ? 'Days to Review' : 'Next Review'
              " icon="i-heroicons-calendar-days" color="amber" />
          </div>

          <!-- Getting Started Widget -->
          <div v-if="showOnboarding" class="animate-item flex justify-center" :style="{ '--delay': '150ms' }">
            <OnboardingWidget :is-static="true" />
          </div>

          <!-- Command Palette Trigger -->
          <div class="animate-item hidden lg:block" :style="{ '--delay': '200ms' }">
            <button
              class="w-full flex items-center gap-3 px-4 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 group"
              @click="openCommandPalette">
              <UIcon name="i-heroicons-magnifying-glass" class="text-xl text-gray-400 dark:text-gray-500" />
              <span class="flex-1 text-left text-gray-500 dark:text-gray-400">
                Search actions, pages, or type a command...
              </span>
              <div class="hidden sm:flex items-center gap-1">
                <UKbd>{{ metaKey }}</UKbd>
                <UKbd>K</UKbd>
              </div>
            </button>
          </div>

          <!-- Contextual Suggestions -->
          <div v-if="suggestions.length > 0" class="animate-item" :style="{ '--delay': '300ms' }">
            <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Suggested for you
            </h2>
            <div class="flex flex-wrap gap-2">
              <NuxtLink v-for="suggestion in suggestions" :key="suggestion.to" :to="suggestion.to"
                class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 group">
                <UIcon :name="suggestion.icon" class="text-gray-500 dark:text-gray-400 group-hover:text-primary-500" />
                <span
                  class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {{ suggestion.label }}
                </span>
                <UBadge v-if="suggestion.badge" :label="suggestion.badge" color="primary" variant="subtle" size="xs" />
              </NuxtLink>
            </div>
          </div>

          <!-- Recent Activity (placeholder for future) -->
          <div class="animate-item" :style="{ '--delay': '400ms' }">
            <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Quick Links
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NuxtLink v-for="link in quickLinks" :key="link.to" :to="link.to"
                class="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 group">
                <UIcon :name="link.icon"
                  class="text-2xl text-gray-400 dark:text-gray-500 group-hover:text-primary-500 transition-colors" />
                <span
                  class="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 text-center">
                  {{ link.label }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Dashboard",
});

const { user } = useAuth();
const { hasBuddies } = useBuddies();
const { unreadCount } = useUnreadCount();
const { incomingCount } = useIncomingFeedbackCount();
const { shouldShow: showOnboarding } = useOnboarding();

// Detect OS for keyboard shortcut display
const metaKey = computed(() => {
  if (import.meta.client) {
    return navigator.platform.includes("Mac") ? "⌘" : "Ctrl";
  }
  return "⌘";
});

// Open command palette by emitting a custom event
const openCommandPalette = () => {
  // Trigger keyboard shortcut programmatically
  const event = new KeyboardEvent("keydown", {
    key: "k",
    metaKey: true,
    bubbles: true,
  });
  document.dispatchEvent(event);
};

// Fetch goals data
const { data: goalsData } = await useFetch("/api/goals");
const goals = computed(() => goalsData.value?.goals || []);

// Calculate active goals count
const activeGoalsCount = computed(
  () => goals.value.filter((g) => g.status === "active").length,
);

// Fetch dashboard stats
const { data: dashboardStats } = await useFetch("/api/dashboard/stats");

// Combined stats for quick stat cards
const stats = computed(() => {
  const given = dashboardStats.value?.feedbackGiven || 0;
  const received = dashboardStats.value?.feedbackReceived || 0;

  return {
    feedbackThisWeek: given + received,
    activeGoals: activeGoalsCount.value,
    daysUntilReview: dashboardStats.value?.daysUntilReview ?? null,
  };
});

// Contextual suggestions based on user state
const suggestions = computed(() => {
  const items: Array<{
    label: string;
    icon: string;
    to: string;
    badge?: string;
    priority: number;
  }> = [];

  // If there's incoming feedback to review (buddy task)
  if (hasBuddies.value && incomingCount.value > 0) {
    items.push({
      label: "Review incoming feedback",
      icon: "i-heroicons-inbox-arrow-down",
      to: "/buddies/feedback",
      badge: `${incomingCount.value} pending`,
      priority: 1,
    });
  }

  // If there's unread feedback
  if (unreadCount.value > 0) {
    items.push({
      label: "Read new feedback",
      icon: "i-heroicons-chat-bubble-left-right",
      to: "/feedback/inbox",
      badge: `${unreadCount.value} unread`,
      priority: 2,
    });
  }

  // Always suggest submitting feedback
  items.push({
    label: "Submit feedback",
    icon: "i-heroicons-paper-airplane",
    to: "/feedback/give",
    priority: 3,
  });

  // If review is coming up soon (within 14 days)
  if (stats.value.daysUntilReview !== null && stats.value.daysUntilReview <= 14) {
    items.push({
      label: "Prepare for your review",
      icon: "i-heroicons-calendar-days",
      to: "/reviews",
      badge: `${stats.value.daysUntilReview} days`,
      priority: 4,
    });
  }

  // Sort by priority and limit to 4
  return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
});

// Quick links grid
const quickLinks = computed(() => {
  const links = [
    { label: "Insights", icon: "i-heroicons-chart-bar", to: "/insights" },
    { label: "Goals", icon: "i-heroicons-flag", to: "/goals" },
    { label: "Brag Bucket", icon: "i-heroicons-star", to: "/brag-bucket" },
    { label: "Reviews", icon: "i-heroicons-calendar-days", to: "/reviews" },
  ];

  return links;
});
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
