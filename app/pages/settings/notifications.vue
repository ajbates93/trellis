<template>
  <UDashboardPanel id="settings-notifications">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
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

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">Email Notifications</h2>
            </template>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-900 dark:text-white font-medium">Feedback notifications</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Receive email notifications when you have new feedback to review or when feedback is published for you.
                </p>
              </div>
              <USwitch
                v-model="emailNotifications"
                :loading="saving"
                @update:model-value="toggleEmailNotifications"
              />
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

useHead({
  title: "Notification Settings",
});

const { user, refreshSession } = useAuth();
const toast = useToast();

const emailNotifications = ref(user.value?.emailNotifications !== false);
const saving = ref(false);

watch(() => user.value?.emailNotifications, (val) => {
  emailNotifications.value = val !== false;
});

async function toggleEmailNotifications(value: boolean) {
  saving.value = true;
  try {
    await $fetch("/api/users/profile", {
      method: "PATCH",
      body: { emailNotifications: value },
    });
    await refreshSession();
    toast.add({
      title: "Success",
      description: value ? "Email notifications enabled" : "Email notifications disabled",
      color: "success",
    });
  } catch (error) {
    console.error("Error updating notification preference:", error);
    emailNotifications.value = !value;
    toast.add({
      title: "Error",
      description: "Failed to update notification preference",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>
