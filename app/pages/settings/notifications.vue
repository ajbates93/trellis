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
              <h2 class="text-lg font-medium">Notification preferences</h2>
              <p class="text-sm text-gray-500 mt-1">
                In-app notifications are always on. Toggle which categories also send email.
              </p>
            </template>

            <div class="space-y-2">
              <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-2 py-1 text-xs uppercase tracking-wide text-gray-500">
                <span>Category</span>
                <span class="w-16 text-center">In-app</span>
                <span class="w-16 text-center">Email</span>
              </div>
              <div
                v-for="cat in categories"
                :key="cat.key"
                class="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-2 py-2 border-t border-gray-100 dark:border-gray-800"
              >
                <div>
                  <div class="text-sm font-medium">{{ cat.label }}</div>
                  <div class="text-xs text-gray-500">{{ cat.description }}</div>
                </div>
                <div class="w-16 flex justify-center">
                  <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-gray-400" />
                </div>
                <div class="w-16 flex justify-center">
                  <USwitch
                    v-if="cat.email !== null"
                    :model-value="emailEnabled(cat.key)"
                    @update:model-value="(v: boolean) => setEmail(cat.key, v)"
                  />
                  <span v-else class="text-gray-400 text-sm">—</span>
                </div>
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

useHead({
  title: "Notification Settings",
});

interface CategoryDef {
  key: string;
  label: string;
  description: string;
  email: boolean | null;
}

const categories: CategoryDef[] = [
  { key: "feedback_received", label: "Feedback received", description: "When someone publishes feedback for you", email: true },
  { key: "buddy_feedback_received", label: "Feedback for someone you buddy", description: "When feedback is published for someone you support", email: true },
  { key: "review_created", label: "Review scheduled by buddy", description: "When your buddy schedules a new review with you", email: true },
  { key: "review_rescheduled", label: "Review rescheduled", description: "When your buddy moves a scheduled review", email: true },
  { key: "review_cancelled", label: "Review cancelled", description: "When your buddy cancels a scheduled review", email: true },
  { key: "review_completed", label: "Review completed", description: "When your buddy marks a review complete", email: true },
  { key: "review_reminder", label: "Review reminders", description: "7-day and 1-day reminders before scheduled reviews", email: true },
  { key: "goal_approaching", label: "Goal approaching target", description: "7 days before a goal's target date (in-app only)", email: null },
  { key: "goal_overdue", label: "Goal overdue", description: "When a goal passes its target date (in-app only)", email: null },
];

const toast = useToast();

const { data: prefsData, refresh: refreshPrefs } = await useFetch<{ preferences: Record<string, boolean> }>(
  "/api/user/notification-preferences",
  { default: () => ({ preferences: {} }) },
);

const emailEnabled = (key: string) => prefsData.value?.preferences?.[key] !== false;

const setEmail = async (key: string, value: boolean) => {
  const next = { ...(prefsData.value?.preferences ?? {}), [key]: value };
  try {
    await $fetch("/api/user/notification-preferences", {
      method: "PATCH",
      body: { preferences: next },
    });
    await refreshPrefs();
  } catch (error) {
    console.error("Error updating preference:", error);
    toast.add({ title: "Error", description: "Failed to update preference", color: "error" });
  }
};
</script>
