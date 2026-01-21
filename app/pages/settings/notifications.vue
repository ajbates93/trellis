<template>
  <UDashboardPanel id="settings-notifications">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Manage your preferences, appearance, and security
          </p>
        </div>

        <!-- Settings Navigation Tabs -->
        <div class="mb-6">
          <div class="border-b border-gray-200 dark:border-gray-800">
            <nav class="-mb-px flex space-x-8">
              <NuxtLink
to="/settings/general" class="border-b-2 py-4 px-1 text-sm font-medium" :class="$route.path === '/settings/general'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ">
                General
              </NuxtLink>
              <NuxtLink
to="/settings/security" class="border-b-2 py-4 px-1 text-sm font-medium" :class="$route.path === '/settings/security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ">
                Security
              </NuxtLink>
              <NuxtLink
to="/settings/notifications" class="border-b-2 py-4 px-1 text-sm font-medium" :class="$route.path === '/settings/notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ">
                Notifications
              </NuxtLink>
              <NuxtLink
to="/settings/integrations" class="border-b-2 py-4 px-1 text-sm font-medium" :class="$route.path === '/settings/integrations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ">
                Integrations
              </NuxtLink>
            </nav>
          </div>
        </div>

        <ComingSoon title="Notification Settings" description="Email and in-app notification preferences coming soon" />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Notification Settings",
});
</script>
