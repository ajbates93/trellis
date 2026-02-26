<template>
  <UDashboardPanel id="insights">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Community Insights Section -->
        <div class="mb-10">
          <div class="mb-6">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Community Insights
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
            Track your feedback activity and discover patterns
          </p>

          <!-- Feedback network + Sentiment side by side -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <FeedbackNetwork />
            <SentimentAnalysis />
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
  title: "Insights",
});

</script>
