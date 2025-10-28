<template>
  <UDashboardPanel id="admin-dashboard">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-2">
            <UIcon
              name="i-heroicons-shield-check"
              class="text-purple-500 text-3xl"
            />
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
          </div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Platform management and analytics dashboard
          </p>
        </div>

        <!-- Coming Soon Card -->
        <UCard class="mb-8">
          <div class="text-center py-12">
            <div class="mb-6">
              <UIcon
                name="i-heroicons-wrench-screwdriver"
                class="text-gray-400 text-6xl mx-auto mb-4"
              />
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Coming Soon - Phase 6
              </h2>
              <p class="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                The admin panel is currently under development. Check back soon
                for powerful management and analytics features.
              </p>
            </div>

            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
            >
              <UIcon name="i-heroicons-clock" class="text-purple-500" />
              <span
                class="text-sm font-medium text-purple-700 dark:text-purple-400"
              >
                Estimated: Phase 6 (Weeks 5-6)
              </span>
            </div>
          </div>
        </UCard>

        <!-- Planned Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Platform Stats -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-chart-bar"
                    class="text-blue-500 text-xl"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Platform Statistics
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Total feedback submitted
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Active users & engagement rates
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Goals completion metrics
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Review schedule tracking
                </li>
              </ul>
            </div>
          </UCard>

          <!-- User Management -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-users"
                    class="text-green-500 text-xl"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  User Management
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Manage buddy assignments
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Set review dates (bulk actions)
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  User roles & permissions
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Activity monitoring
                </li>
              </ul>
            </div>
          </UCard>

          <!-- CSV Onboarding -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-up-tray"
                    class="text-purple-500 text-xl"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  CSV Onboarding
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Bulk user import
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  CSV validation & preview
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Error reporting
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Import history & audit log
                </li>
              </ul>
            </div>
          </UCard>

          <!-- Team Engagement -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-fire"
                    class="text-amber-500 text-xl"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Engagement Analytics
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Team engagement charts
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Feedback distribution by role
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Top contributors leaderboard
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Activity trends over time
                </li>
              </ul>
            </div>
          </UCard>

          <!-- Feedback Moderation -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center"
                >
                  <UIcon name="i-heroicons-flag" class="text-red-500 text-xl" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Content Moderation
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Review pending feedback
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Batch publish/reject
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Flagged content review
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Content quality insights
                </li>
              </ul>
            </div>
          </UCard>

          <!-- System Settings -->
          <UCard>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg bg-gray-500/10 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-cog-6-tooth"
                    class="text-gray-500 text-xl"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  System Settings
                </h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Platform configuration
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Email notification settings
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Review cycle scheduling
                </li>
                <li class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="text-green-500 text-sm"
                  />
                  Integration management
                </li>
              </ul>
            </div>
          </UCard>
        </div>

        <!-- Back to Dashboard Button -->
        <div class="mt-8 flex justify-center">
          <UButton to="/" color="white" size="lg" icon="i-heroicons-arrow-left">
            Back to Dashboard
          </UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});
</script>
