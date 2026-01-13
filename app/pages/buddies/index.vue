<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "buddy"],
});

useHead({
  title: "Buddies",
});

const { buddies, pending } = useBuddies();
</script>

<template>
  <UDashboardPanel id="buddies">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Page header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Buddies
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Your assigned buddies and their profile information
            </p>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="pending" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <!-- Empty state (shouldn't happen due to middleware, but good to have) -->
        <EmptyState
v-else-if="buddies.length === 0" icon="i-heroicons-user-group" heading="No buddies assigned"
          description="You don't have any buddies assigned to you yet. Contact your admin to get buddies assigned."
          variant="primary" />

        <!-- Buddies grid -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <BuddiesBuddyCard v-for="buddy in buddies" :key="buddy.id" :buddy="buddy" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
