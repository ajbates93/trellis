<template>
  <UDashboardPanel id="admin-users">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Header -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-users" class="text-blue-500 text-3xl" />
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
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
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

const selectedTab = ref("all");
const loading = ref(true);
const error = ref(false);

const allUsers = ref<any[]>([]);
const counts = ref({
  all: 0,
  active: 0,
  invited: 0,
});

const showEditModal = ref(false);
const showAddModal = ref(false);
const selectedUser = ref<any>(null);

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

const openEditModal = (user: any) => {
  selectedUser.value = user;
  showEditModal.value = true;
};

const handleImpersonate = async (user: any) => {
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

const handleSuccess = async () => {
  // Refetch users after successful operation
  await fetchUsers();
};

// Initial load
onMounted(() => {
  fetchUsers();
});
</script>
