<template>
  <UDashboardPanel id="settings-privacy">
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
to="/settings/privacy" class="border-b-2 py-4 px-1 text-sm font-medium" :class="$route.path === '/settings/privacy'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                ">
                Privacy
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
          <!-- Data Export Section -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">Your data</h2>
            </template>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-sm font-medium">Download my data</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Export a JSON file containing your profile, feedback, goals, reviews, and check-ins.
                </p>
              </div>
              <UButton
                color="primary"
                variant="outline"
                icon="i-heroicons-arrow-down-tray"
                :loading="downloadingData"
                @click="handleDownloadData"
              >
                Download my data
              </UButton>
            </div>
          </UCard>

          <!-- Account Deletion Section -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">Delete account</h2>
            </template>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-sm font-medium">Delete my account</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Permanently anonymize your account and remove your personal data. This cannot be undone.
                  You will be signed out immediately.
                </p>
              </div>
              <UButton color="error" variant="solid" icon="i-heroicons-trash" @click="openDeleteModal">
                Delete my account
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- Delete Account Confirmation Modal -->
        <UModal v-model:open="showDeleteModal" title="Delete your account">
          <template #body>
            <div class="space-y-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                This will permanently anonymize your account, remove your goals, check-ins, and other
                personal data, and sign you out. This action cannot be undone.
              </p>
              <UFormField label="Type DELETE to confirm" :required="true">
                <UInput
                  v-model="deleteConfirmText"
                  placeholder="DELETE"
                  class="w-full"
                  :disabled="deletingAccount"
                />
              </UFormField>
            </div>
          </template>

          <template #footer>
            <div class="flex justify-between">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="deletingAccount"
                @click="showDeleteModal = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :disabled="!isDeleteConfirmValid"
                :loading="deletingAccount"
                @click="handleDeleteAccount"
              >
                Delete my account
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useHead({
  title: "Privacy Settings",
});

const { signOut } = useAuth();
const toast = useToast();

// Download my data
const downloadingData = ref(false);

const handleDownloadData = async () => {
  downloadingData.value = true;
  try {
    const data = await $api("/user/export-data");
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trellis-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      title: "Export downloaded",
      description: "Your data has been downloaded to your device",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to export data:", error);
  } finally {
    downloadingData.value = false;
  }
};

// Delete account
const showDeleteModal = ref(false);
const deleteConfirmText = ref("");
const deletingAccount = ref(false);

const isDeleteConfirmValid = computed(() => deleteConfirmText.value === "DELETE");

const openDeleteModal = () => {
  deleteConfirmText.value = "";
  showDeleteModal.value = true;
};

watch(showDeleteModal, (isOpen) => {
  if (!isOpen) {
    deleteConfirmText.value = "";
  }
});

const handleDeleteAccount = async () => {
  if (!isDeleteConfirmValid.value) return;

  deletingAccount.value = true;
  try {
    await $api("/user/delete-account", { method: "POST" });

    showDeleteModal.value = false;

    toast.add({
      title: "Account deleted",
      description: "Your account has been deleted. Signing you out...",
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    await signOut();
  } catch (error: any) {
    // The sole-admin (400) message and any other server error is already
    // surfaced via the global $api error toast (see composables/useApi.ts).
    console.error("Failed to delete account:", error);
  } finally {
    deletingAccount.value = false;
  }
};
</script>
