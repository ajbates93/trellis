<template>
  <UDashboardPanel id="settings-general">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            General Settings
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Manage your preferences and appearance
          </p>
        </div>

        <div class="space-y-6">
          <!-- Appearance Section -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">Appearance</h2>
            </template>

            <div class="space-y-4">
              <!-- Dark Mode Toggle -->
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-medium">Theme</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Choose between light and dark mode
                  </p>
                </div>
                <UColorModeSwitch />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});
</script>
