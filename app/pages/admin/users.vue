<template>
  <UDashboardPanel id="admin-users">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Header -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-users" class="text-blue-500 text-3xl" />
              <h1
                class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
              >
                User Management
              </h1>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Manage team members, roles, and buddy assignments
            </p>
          </div>
          <UButton
            icon="i-heroicons-plus"
            color="primary"
            @click="showAddModal = true"
          >
            Add User
          </UButton>
        </div>

        <!-- Tabs -->
        <UTabs v-model="selectedTab" :items="tabs" class="mb-6" />

        <!-- Tab Content -->
        <div class="mt-6">
          <AdminUserTable
            :users="filteredUsers"
            :loading="loading"
            :error="error"
            @edit="openEditModal"
            @impersonate="handleImpersonate"
            @remove="openRemoveModal"
            @send-invitation="handleSendInvitation"
            @send-password-reset="handleSendPasswordReset"
          />
        </div>
      </div>
      <!-- Edit User Modal -->
      <AdminEditUserModal
        v-model="showEditModal"
        :user="selectedUser"
        :all-users="allUsers"
        @success="handleSuccess"
      />

      <!-- Add User Modal -->
      <AdminAddUserModal
        v-model="showAddModal"
        :all-users="allUsers"
        @success="handleSuccess"
      />

      <!-- Remove User Confirmation Modal -->
      <UModal
        v-model:open="showRemoveModal"
        title="Remove User"
        :description="`Are you sure you want to remove ${userToRemove?.name}? This action cannot be undone.`"
        class="sm:max-w-md"
      >
        <template #body>
          <div class="space-y-4">
            <div
              class="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="text-red-500 text-2xl flex-shrink-0"
              />
              <div class="text-sm text-red-700 dark:text-red-300">
                <p class="font-medium mb-1">This will permanently delete:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>All feedback given and received by this user</li>
                  <li>All personal goals</li>
                  <li>All review schedules</li>
                  <li>
                    Users who had this person as their buddy will be reassigned
                    to an admin
                  </li>
                </ul>
              </div>
            </div>

            <div
              v-if="userToRemove"
              class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <UAvatar
                :src="userToRemove.avatarUrl || userToRemove.image"
                :alt="userToRemove.name"
                size="sm"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ userToRemove.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ userToRemove.email }}
                </div>
              </div>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="removing"
              @click="showRemoveModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="removing"
              @click="handleRemoveUser"
            >
              Remove User
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { User } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

const selectedTab = ref("all");
const loading = ref(true);
const error = ref(false);

const allUsers = ref<User[]>([]);
const counts = ref({
  all: 0,
  active: 0,
  invited: 0,
});

const showEditModal = ref(false);
const showAddModal = ref(false);
const showRemoveModal = ref(false);
const selectedUser = ref<User | null>(null);
const userToRemove = ref<User | null>(null);
const removing = ref(false);

// Define tabs with badges
const tabs = computed(() => [
  {
    label: "All Users",
    value: "all",
    icon: "i-heroicons-users",
    badge: counts.value.all,
  },
  {
    label: "Active",
    value: "active",
    icon: "i-heroicons-check-circle",
    badge: counts.value.active,
  },
  {
    label: "Invited",
    value: "invited",
    icon: "i-heroicons-envelope",
    badge: counts.value.invited,
  },
]);

// Fetch users based on selected tab
const filteredUsers = computed(() => {
  if (selectedTab.value === "all") {
    return allUsers.value;
  } else if (selectedTab.value === "active") {
    return allUsers.value.filter((u) => u.status === "active");
  } else {
    return allUsers.value.filter((u) => u.status === "invited");
  }
});

const fetchUsers = async (filter?: string) => {
  loading.value = true;
  error.value = false;
  try {
    const data = await $fetch("/api/admin/users", {
      query: { filter },
    });

    if (data) {
      allUsers.value = data.users;
      counts.value = data.counts;
    }
  } catch (e) {
    console.error("Failed to load users:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const openEditModal = (user: User) => {
  selectedUser.value = user;
  showEditModal.value = true;
};

const handleImpersonate = async (user: User) => {
  try {
    const { authClient } = useAuth();

    // Show loading toast
    const toast = useToast();
    toast.add({
      title: "Impersonating user...",
      description: `Switching to ${user.name}'s account`,
      color: "info",
    });

    // Call the impersonate method from Better Auth
    await authClient.admin.impersonateUser({
      userId: user.id,
    });

    // Success - redirect to dashboard
    toast.add({
      title: "Impersonation successful",
      description: `You are now viewing as ${user.name}`,
      color: "success",
    });

    // Redirect to dashboard to see the impersonated view
    window.location.href = "/";
  } catch (error) {
    console.error("Failed to impersonate user:", error);
    const toast = useToast();
    toast.add({
      title: "Impersonation failed",
      description: "Failed to impersonate user. Please try again.",
      color: "error",
    });
  }
};

const openRemoveModal = (user: User) => {
  userToRemove.value = user;
  showRemoveModal.value = true;
};

const handleRemoveUser = async () => {
  if (!userToRemove.value) return;

  removing.value = true;
  const toast = useToast();

  try {
    await $fetch(`/api/admin/users/${userToRemove.value.id}`, {
      method: "DELETE",
    });

    toast.add({
      title: "User removed",
      description: `${userToRemove.value.name} has been removed successfully`,
      color: "success",
    });

    showRemoveModal.value = false;
    userToRemove.value = null;

    // Refetch users
    await fetchUsers();
  } catch (error) {
    console.error("Failed to remove user:", error);
    toast.add({
      title: "Failed to remove user",
      description:
        (error as { data?: { message?: string } }).data?.message ||
        "An error occurred while removing the user",
      color: "error",
    });
  } finally {
    removing.value = false;
  }
};

const handleSuccess = async () => {
  // Refetch users after successful operation
  await fetchUsers();
};

// Send invitation to pre-created user
const handleSendInvitation = async (user: User) => {
  const toast = useToast();

  try {
    await $fetch("/api/admin/onboard/send-invitation", {
      method: "POST",
      body: { userId: user.id },
    });

    toast.add({
      title: "Invitation Sent",
      description: `Password setup email sent to ${user.email}`,
      color: "green",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to send invitation:", error);
    toast.add({
      title: "Failed to Send Invitation",
      description:
        error.data?.message || "An error occurred while sending the invitation",
      color: "red",
      icon: "i-heroicons-exclamation-triangle",
    });
  }
};

// Send password reset to active user
const handleSendPasswordReset = async (user: User) => {
  const toast = useToast();

  try {
    // Use Better Auth's forget password endpoint
    const { authClient } = useAuth();
    await authClient.forgetPassword({
      email: user.email,
      redirectTo: "/reset-password",
    });

    toast.add({
      title: "Password Reset Sent",
      description: `Password reset email sent to ${user.email}`,
      color: "green",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to send password reset:", error);
    toast.add({
      title: "Failed to Send Password Reset",
      description:
        error.message ||
        "An error occurred while sending the password reset email",
      color: "red",
      icon: "i-heroicons-exclamation-triangle",
    });
  }
};

// Initial load
onMounted(() => {
  fetchUsers();
});
</script>
