<template>
  <UDashboardPanel id="settings-integrations">
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
                to="/settings/general"
                class="border-b-2 py-4 px-1 text-sm font-medium"
                :class="$route.path === '/settings/general'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                "
              >
                General
              </NuxtLink>
              <NuxtLink
                to="/settings/security"
                class="border-b-2 py-4 px-1 text-sm font-medium"
                :class="$route.path === '/settings/security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                "
              >
                Security
              </NuxtLink>
              <NuxtLink
                to="/settings/notifications"
                class="border-b-2 py-4 px-1 text-sm font-medium"
                :class="$route.path === '/settings/notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                "
              >
                Notifications
              </NuxtLink>
              <NuxtLink
                to="/settings/integrations"
                class="border-b-2 py-4 px-1 text-sm font-medium"
                :class="$route.path === '/settings/integrations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                "
              >
                Integrations
              </NuxtLink>
            </nav>
          </div>
        </div>

        <!-- Success/Error Messages -->
        <div v-if="successMessage" class="mb-6">
          <UAlert
            color="green"
            variant="soft"
            :title="successMessage"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link', padded: false }"
            @close="successMessage = null"
          />
        </div>

        <div v-if="errorMessage" class="mb-6">
          <UAlert
            color="red"
            variant="soft"
            :title="errorMessage"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'gray', variant: 'link', padded: false }"
            @close="errorMessage = null"
          />
        </div>

        <div class="space-y-6">
          <!-- Slack Integration Section -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex-shrink-0">
                  <svg class="w-8 h-8" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.34 33.48a5.67 5.67 0 1 1-5.67-5.67h5.67v5.67Z" fill="#E01E5A"/>
                    <path d="M14.17 33.48a5.67 5.67 0 1 1 11.34 0v14.18a5.67 5.67 0 1 1-11.34 0V33.48Z" fill="#E01E5A"/>
                    <path d="M19.84 11.34a5.67 5.67 0 1 1 5.67-5.67v5.67h-5.67Z" fill="#36C5F0"/>
                    <path d="M19.84 14.17a5.67 5.67 0 1 1 0 11.34H5.67a5.67 5.67 0 1 1 0-11.34h14.17Z" fill="#36C5F0"/>
                    <path d="M42.16 19.84a5.67 5.67 0 1 1 5.67 5.67h-5.67v-5.67Z" fill="#2EB67D"/>
                    <path d="M39.33 19.84a5.67 5.67 0 1 1-11.33 0V5.67a5.67 5.67 0 1 1 11.33 0v14.17Z" fill="#2EB67D"/>
                    <path d="M33.66 42.16a5.67 5.67 0 1 1-5.66 5.67v-5.67h5.66Z" fill="#ECB22E"/>
                    <path d="M33.66 39.33a5.67 5.67 0 1 1 0-11.33h14.17a5.67 5.67 0 1 1 0 11.33H33.66Z" fill="#ECB22E"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg font-medium">Slack</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Submit feedback directly from Slack
                  </p>
                </div>
              </div>
            </template>

            <div class="space-y-4">
              <!-- Not Connected State -->
              <div v-if="!slackWorkspace && !isLoading" class="space-y-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Connect your Slack workspace to submit feedback using the <code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono">/submit</code> command.
                </p>

                <div class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div class="text-sm text-blue-700 dark:text-blue-300">
                    <p class="font-medium mb-1">Admin access required</p>
                    <p>Only workspace administrators can install Slack integrations.</p>
                  </div>
                </div>

                <div v-if="isAdmin">
                  <UButton
                    color="primary"
                    size="lg"
                    :loading="isInstalling"
                    @click="handleInstallSlack"
                  >
                    <template #leading>
                      <UIcon name="i-heroicons-plus" />
                    </template>
                    Add to Slack
                  </UButton>
                </div>
                <div v-else>
                  <UButton
                    color="gray"
                    size="lg"
                    disabled
                  >
                    <template #leading>
                      <UIcon name="i-heroicons-lock-closed" />
                    </template>
                    Admin Access Required
                  </UButton>
                </div>
              </div>

              <!-- Connected State -->
              <div v-if="slackWorkspace && !isLoading" class="space-y-4">
                <div class="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div class="text-sm text-green-700 dark:text-green-300">
                    <p class="font-medium mb-1">Connected to {{ slackWorkspace.slackTeamName }}</p>
                    <p>Installed {{ formatDate(slackWorkspace.installedAt) }}</p>
                  </div>
                </div>

                <div class="space-y-3">
                  <h3 class="text-sm font-medium">How to use</h3>
                  <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li class="flex items-start gap-2">
                      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Type <code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">/submit</code> in any Slack channel</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Select a recipient and write your feedback</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Your buddy will publish it later via the web app</span>
                    </li>
                  </ul>
                </div>

                <div v-if="isAdmin" class="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <UButton
                    color="red"
                    variant="soft"
                    :loading="isDisconnecting"
                    @click="handleDisconnectSlack"
                  >
                    <template #leading>
                      <UIcon name="i-heroicons-x-mark" />
                    </template>
                    Disconnect Slack
                  </UButton>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="isLoading" class="flex items-center justify-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
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
  title: "Integrations",
});

const route = useRoute();
const router = useRouter();

// State
const slackWorkspace = ref<any>(null);
const isLoading = ref(true);
const isInstalling = ref(false);
const isDisconnecting = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isAdmin = ref(false);

// Check URL params for success/error messages
onMounted(async () => {
  // Check for success/error in query params
  if (route.query.success === 'slack_installed') {
    successMessage.value = 'Slack integration installed successfully!';
    // Clean URL
    router.replace({ query: {} });
  } else if (route.query.error) {
    errorMessage.value = `Failed to install Slack: ${route.query.error}`;
    // Clean URL
    router.replace({ query: {} });
  }

  // Fetch current Slack integration status
  await fetchSlackWorkspace();
});

// Fetch current Slack workspace connection
async function fetchSlackWorkspace() {
  try {
    isLoading.value = true;
    const response = await $fetch('/api/integrations/slack/status');
    slackWorkspace.value = response.slackWorkspace;
    isAdmin.value = response.isAdmin;
  } catch (error: any) {
    console.error('Failed to fetch Slack workspace:', error);
    if (error.statusCode !== 404) {
      errorMessage.value = 'Failed to load Slack integration status';
    }
  } finally {
    isLoading.value = false;
  }
}

// Handle Slack installation
async function handleInstallSlack() {
  isInstalling.value = true;
  // Navigate to install endpoint (will redirect to Slack OAuth)
  window.location.href = '/api/integrations/slack/install';
}

// Handle Slack disconnection
async function handleDisconnectSlack() {
  if (!confirm('Are you sure you want to disconnect Slack? Users will no longer be able to submit feedback via Slack.')) {
    return;
  }

  try {
    isDisconnecting.value = true;
    await $fetch('/api/integrations/slack/disconnect', {
      method: 'POST',
    });
    slackWorkspace.value = null;
    successMessage.value = 'Slack integration disconnected successfully';
  } catch (error: any) {
    console.error('Failed to disconnect Slack:', error);
    errorMessage.value = error.data?.message || 'Failed to disconnect Slack';
  } finally {
    isDisconnecting.value = false;
  }
}

// Format date helper
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
</script>
