<template>
  <UDashboardPanel id="insights">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Community Insights Section -->
        <div class="mb-10">
          <div class="mb-6">
            <h1
              class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex gap-3 items-center"
            >
              Community Insights<UBadge variant="subtle" size="sm">Beta</UBadge>
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              See how your team is doing together
            </p>
          </div>

          <!-- Garden + Activity Summary row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CommunityTrellisGarden />
            <CommunityActivitySummary />
          </div>

          <!-- Leaderboard (full width) -->
          <CommunityLeaderboard />
        </div>

        <!-- Divider -->
        <USeparator class="mb-10" />

        <!-- Personal Insights Section -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Your Insights
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            AI-powered analysis of your feedback to surface themes, sentiment
            trends, and actionable goals
          </p>

          <SentimentAnalysis />
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
  title: "Insights",
});
</script>
