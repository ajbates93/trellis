<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "buddy"],
});

const { buddies, pending } = useBuddies();
</script>

<template>
  <UDashboardPanel id="buddies">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Buddies
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Your assigned buddies and their profile information
            </p>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="pending" class="flex justify-center py-16">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 text-primary animate-spin"
          />
        </div>

        <!-- Empty state (shouldn't happen due to middleware, but good to have) -->
        <div v-else-if="buddies.length === 0">
          <div class="text-center py-16 px-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-primary" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No buddies assigned
            </h3>
            <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              You don't have any buddies assigned to you yet. Contact your admin to get buddies assigned.
            </p>
          </div>
        </div>

        <!-- Buddies grid -->
        <div
          v-else
          class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <BuddiesBuddyCard
            v-for="buddy in buddies"
            :key="buddy.id"
            :buddy="buddy"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
