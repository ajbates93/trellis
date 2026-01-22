<template>
  <UDashboardPanel id="settings-security">
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

        <div class="space-y-6">
          <!-- Connected Accounts Section -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">Connected Accounts</h2>
            </template>

            <div class="space-y-4">
              <!-- Email/Password Account -->
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-heroicons-key" class="text-primary text-xl" />
                  </div>
                  <div>
                    <h3 class="text-sm font-medium">Email & Password</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ user?.email }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge v-if="hasPassword" color="success" variant="soft" size="sm">
                    Connected
                  </UBadge>
                  <UBadge v-else color="warning" variant="soft" size="sm">
                    Not Connected
                  </UBadge>
                  <UButton v-if="!hasPassword" color="success" size="sm" @click="showAddPasswordModal = true">
                    Set Password
                  </UButton>
                  <UButton v-else color="primary" size="sm" @click="showChangePasswordModal = true">
                    Change Password
                  </UButton>
                </div>
              </div>

              <!-- Google Account -->
              <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24">
                      <path
fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path
fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path
fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path
fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium">Google</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Sign in with your Google account
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge v-if="hasGoogleAccount" color="success" variant="soft" size="sm">
                    Connected
                  </UBadge>
                  <UBadge v-else color="warning" variant="soft" size="sm">
                    Not Connected
                  </UBadge>
                  <UButton
v-if="!hasGoogleAccount" color="primary" size="sm" :loading="linkingGoogle"
                    @click="handleLinkGoogle">
                    Link Google
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>
        </div>
        <!-- Add Password Modal -->
        <UModal v-model:open="showAddPasswordModal" title="Set Your Password">
          <template #body>
            <div class="space-y-4">
              <UFormField label="New Password" :required="true">
                <UInput
v-model="addPasswordForm.password" type="password" placeholder="Enter password"
                  icon="i-heroicons-lock-closed" class="w-full" :disabled="addingPassword" />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must be at least 8 characters long
                </p>
              </UFormField>

              <UFormField label="Confirm Password" :required="true">
                <UInput
v-model="addPasswordForm.confirmPassword" type="password" placeholder="Confirm password"
                  icon="i-heroicons-lock-closed" class="w-full" :disabled="addingPassword" />
                <p v-if="addPasswordErrors.confirmPassword" class="text-xs text-red-500 mt-1">
                  {{ addPasswordErrors.confirmPassword }}
                </p>
              </UFormField>
            </div>
          </template>

          <template #footer>
            <div class="flex justify-between">
              <UButton color="neutral" variant="ghost" :disabled="addingPassword" @click="showAddPasswordModal = false">
                Cancel
              </UButton>
              <UButton :disabled="!isAddPasswordFormValid" :loading="addingPassword" @click="handleAddPassword">
                Set Password
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Change Password Modal -->
        <UModal v-model:open="showChangePasswordModal" title="Change Password">
          <template #body>
            <div class="space-y-4">
              <UFormField label="Current Password" :required="true">
                <UInput
v-model="changePasswordForm.currentPassword" type="password"
                  placeholder="Enter current password" icon="i-heroicons-lock-closed" class="w-full"
                  :disabled="changingPassword" />
                <p v-if="changePasswordErrors.currentPassword" class="text-xs text-red-500 mt-1">
                  {{ changePasswordErrors.currentPassword }}
                </p>
              </UFormField>

              <UFormField label="New Password" :required="true">
                <UInput
v-model="changePasswordForm.newPassword" type="password" placeholder="Enter new password"
                  icon="i-heroicons-lock-closed" class="w-full" :disabled="changingPassword" />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must be at least 8 characters long
                </p>
              </UFormField>

              <UFormField label="Confirm New Password" :required="true">
                <UInput
v-model="changePasswordForm.confirmPassword" type="password" placeholder="Confirm new password"
                  icon="i-heroicons-lock-closed" class="w-full" :disabled="changingPassword" />
                <p v-if="changePasswordErrors.confirmPassword" class="text-xs text-red-500 mt-1">
                  {{ changePasswordErrors.confirmPassword }}
                </p>
              </UFormField>
            </div>
          </template>

          <template #footer>
            <div class="flex justify-between">
              <UButton
color="neutral" variant="ghost" :disabled="changingPassword"
                @click="showChangePasswordModal = false">
                Cancel
              </UButton>
              <UButton :disabled="!isChangePasswordFormValid" :loading="changingPassword" @click="handleChangePassword">
                Update Password
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
  title: "Security Settings",
});

const { user, hasPassword, authClient } = useAuth();
const toast = useToast();

// Fetch user accounts to check for Google connection
const accounts = ref<any[]>([]);
const loadingAccounts = ref(true);

const fetchAccounts = async () => {
  try {
    const data = await $fetch("/api/auth/accounts");
    accounts.value = data || [];
    console.log("Accounts loaded:", accounts.value);
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    accounts.value = [];
  } finally {
    loadingAccounts.value = false;
  }
};

onMounted(() => {
  fetchAccounts();
});

const hasGoogleAccount = computed(() => {
  return accounts.value.some((account) => account.providerId === "google");
});

// Link Google Account
const linkingGoogle = ref(false);
const handleLinkGoogle = async () => {
  linkingGoogle.value = true;
  try {
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/security",
    });
  } catch (error: any) {
    console.error("Failed to link Google:", error);
    toast.add({
      title: "Link Failed",
      description: error.message || "Failed to link Google account",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
    linkingGoogle.value = false;
  }
};

// Add Password (for OAuth-only users)
const showAddPasswordModal = ref(false);
const addingPassword = ref(false);
const addPasswordForm = ref({
  password: "",
  confirmPassword: "",
});
const addPasswordErrors = ref({
  password: "",
  confirmPassword: "",
});

// Reset add password errors when modal opens
watch(showAddPasswordModal, (isOpen) => {
  if (isOpen) {
    addPasswordErrors.value = {
      password: "",
      confirmPassword: "",
    };
  }
});

// Change Password (for users with password enabled)
const showChangePasswordModal = ref(false);

// Reset change password errors when modal opens
watch(showChangePasswordModal, (isOpen) => {
  if (isOpen) {
    changePasswordErrors.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  }
});

const isAddPasswordFormValid = computed(() => {
  return (
    addPasswordForm.value.password.length >= 8 &&
    addPasswordForm.value.password === addPasswordForm.value.confirmPassword
  );
});

const handleAddPassword = async () => {
  // Validate
  addPasswordErrors.value = {
    password: "",
    confirmPassword: "",
  };

  if (addPasswordForm.value.password.length < 8) {
    addPasswordErrors.value.password = "Password must be at least 8 characters";
    return;
  }

  if (
    addPasswordForm.value.password !== addPasswordForm.value.confirmPassword
  ) {
    addPasswordErrors.value.confirmPassword = "Passwords do not match";
    return;
  }

  addingPassword.value = true;

  try {
    await $fetch("/api/auth/add-password", {
      method: "POST",
      body: {
        password: addPasswordForm.value.password,
      },
    });

    toast.add({
      title: "Password Added",
      description: "You can now sign in with your email and password",
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    showAddPasswordModal.value = false;
    addPasswordForm.value = {
      password: "",
      confirmPassword: "",
    };

    // Refresh user session to update passwordEnabled field
    await authClient.session.get({ fetchOptions: { cache: "no-store" } });

    // Refresh accounts list to show the new credential account
    await fetchAccounts();
  } catch (error: any) {
    console.error("Failed to add password:", error);
    toast.add({
      title: "Failed to Add Password",
      description: error.data?.message || "An error occurred",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  } finally {
    addingPassword.value = false;
  }
};

// Change Password (for users with password enabled)
const changingPassword = ref(false);
const changePasswordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const changePasswordErrors = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const isChangePasswordFormValid = computed(() => {
  return (
    changePasswordForm.value.currentPassword.length > 0 &&
    changePasswordForm.value.newPassword.length >= 8 &&
    changePasswordForm.value.newPassword ===
    changePasswordForm.value.confirmPassword
  );
});

const handleChangePassword = async () => {
  // Validate
  changePasswordErrors.value = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  if (changePasswordForm.value.newPassword.length < 8) {
    changePasswordErrors.value.newPassword =
      "Password must be at least 8 characters";
    return;
  }

  if (
    changePasswordForm.value.newPassword !==
    changePasswordForm.value.confirmPassword
  ) {
    changePasswordErrors.value.confirmPassword = "Passwords do not match";
    return;
  }

  changingPassword.value = true;

  try {
    await authClient.changePassword({
      newPassword: changePasswordForm.value.newPassword,
      currentPassword: changePasswordForm.value.currentPassword,
      revokeOtherSessions: false,
    });

    toast.add({
      title: "Password Changed",
      description: "Your password has been updated successfully",
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    // Close modal and clear form
    showChangePasswordModal.value = false;
    changePasswordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (error: any) {
    console.error("Failed to change password:", error);

    // Handle specific errors
    if (error.message?.includes("Invalid")) {
      changePasswordErrors.value.currentPassword =
        "Current password is incorrect";
    } else {
      toast.add({
        title: "Failed to Change Password",
        description: error.message || "An error occurred",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    }
  } finally {
    changingPassword.value = false;
  }
};
</script>
