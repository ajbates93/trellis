<script setup lang="ts">
definePageMeta({
  middleware: ["super-admin"],
});

const route = useRoute();
const id = route.params.id as string;

/**
 * Local response shapes for the dynamic super-admin workspace routes — the
 * interpolated paths can't be matched against Nitro's typed routes. They
 * mirror the server handlers' return values (serialized).
 */
interface WorkspaceDetailResponse {
  workspace: {
    id: string;
    name: string;
    logoUrl: string | null;
    createdAt: string | null;
    userCount: number;
    adminCount: number;
  };
}

interface WorkspaceUsersResponse {
  workspace: { id: string; name: string };
  users: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    roleType: string | null;
    emailVerified: boolean;
    createdAt: string;
    avatarUrl: string | null;
    image: string | null;
    status: string;
  }[];
}

const { data: workspaceData, status, refresh } = useApi<WorkspaceDetailResponse>(
  `/super-admin/workspaces/${id}`,
);
const { data: usersData } = useApi<WorkspaceUsersResponse>(
  `/super-admin/workspaces/${id}/users`,
);

useHead({
  title: computed(() => workspaceData.value?.workspace?.name || "Workspace Details"),
});

const isEditModalOpen = ref(false);
const fileInput = ref<HTMLInputElement>();
const previewLogo = ref<string | null>(null);
const editForm = ref({
  name: "",
  logoUrl: "",
});
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);

const toast = useToast();
const router = useRouter();

// Initialize edit form when data loads
watch(workspaceData, (data) => {
  if (data?.workspace) {
    editForm.value = {
      name: data.workspace.name,
      logoUrl: data.workspace.logoUrl || "",
    };
    previewLogo.value = data.workspace.logoUrl || null;
  }
}, { immediate: true });

// Reset preview when modal opens
watch(isEditModalOpen, (isOpen) => {
  if (isOpen && workspaceData.value?.workspace) {
    previewLogo.value = workspaceData.value.workspace.logoUrl || null;
    editForm.value.logoUrl = workspaceData.value.workspace.logoUrl || "";
  }
});

const onLogoSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validate file size (500 KB max)
  if (file.size > 500 * 1024) {
    toast.add({
      title: "File too large",
      description: "Logo must be less than 500 KB",
      color: "error",
    });
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    editForm.value.logoUrl = base64;
    previewLogo.value = base64;
  };
  reader.readAsDataURL(file);

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const removeLogo = () => {
  editForm.value.logoUrl = "";
  previewLogo.value = null;
};

const saveWorkspace = async () => {
  if (!editForm.value.name) {
    toast.add({
      title: "Error",
      description: "Workspace name is required",
      color: "error",
    });
    return;
  }

  isSaving.value = true;

  try {
    await $api(`/super-admin/workspaces/${id}`, {
      method: "PATCH",
      body: {
        name: editForm.value.name,
        logoUrl: editForm.value.logoUrl || null,
      },
    });

    toast.add({
      title: "Success",
      description: "Workspace updated successfully",
      color: "success",
    });

    isEditModalOpen.value = false;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.data?.message || "Failed to update workspace",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteWorkspace = async () => {
  isDeleting.value = true;

  try {
    await $api(`/super-admin/workspaces/${id}`, {
      method: "DELETE",
    });

    toast.add({
      title: "Success",
      description: "Workspace deleted successfully",
      color: "success",
    });

    router.push("/workspaces");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.data?.message || "Failed to delete workspace",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
    isDeleteModalOpen.value = false;
  }
};
</script>

<template>
  <UDashboardPanel>
    <UDashboardNavbar>
      <template #leading>
        <NuxtLink to="/workspaces" class="mr-2">
          <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" size="sm" />
        </NuxtLink>
        <span class="text-lg font-semibold">{{ workspaceData?.workspace?.name || 'Workspace' }}</span>
      </template>
      <template #right>
        <UButton label="Edit" icon="i-heroicons-pencil" variant="outline" @click="isEditModalOpen = true" />
        <UButton
label="Delete" icon="i-heroicons-trash" color="error" variant="ghost"
          @click="isDeleteModalOpen = true" />
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent class="pt-16 p-6 sm:pt-16 lg:pt-8">
      <div v-if="status === 'pending'" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <div v-else-if="workspaceData?.workspace">
        <!-- Workspace Info -->
        <UCard class="mb-6">
          <div class="flex items-start gap-6">
            <div class="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <img
v-if="workspaceData.workspace.logoUrl" :src="workspaceData.workspace.logoUrl"
                :alt="workspaceData.workspace.name" class="w-14 h-14 rounded object-cover">
              <UIcon v-else name="i-heroicons-building-office-2" class="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 class="text-2xl font-bold">{{ workspaceData.workspace.name }}</h2>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                {{ workspaceData.workspace.userCount }} users
                ({{ workspaceData.workspace.adminCount }} admins)
              </p>
              <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Created {{ workspaceData.workspace.createdAt
                  ? new Date(workspaceData.workspace.createdAt).toLocaleDateString()
                  : "—" }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Users List -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Users</h3>
          </template>

          <div v-if="usersData?.users?.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-gray-500 dark:text-gray-400">No users in this workspace</p>
          </div>

          <div v-else class="divide-y divide-gray-200 dark:divide-gray-800 max-h-96 overflow-y-auto">
            <div v-for="user in usersData?.users" :key="user.id" class="py-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UAvatar
:src="user.avatarUrl || user.image || undefined" :alt="user.name"
                  :ui="{ fallback: 'bg-primary text-white' }" />
                <div>
                  <p class="font-medium">{{ user.name }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ user.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge v-if="user.role === 'admin'" label="Admin" color="primary" variant="subtle" />
                <UBadge
:label="user.status" :color="user.status === 'active' ? 'success' : 'warning'"
                  variant="subtle" />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UDashboardPanelContent>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen" title="Edit Workspace">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Workspace Name" required>
            <UInput v-model="editForm.name" placeholder="Acme Corp" class="w-full" />
          </UFormField>

          <UFormField label="Logo">
            <div class="space-y-3">
              <!-- Logo preview -->
              <div v-if="previewLogo" class="flex items-center gap-4">
                <img :src="previewLogo" alt="Logo preview" class="w-16 h-16 rounded-lg object-cover">
                <UButton variant="outline" color="error" size="sm" icon="i-heroicons-trash" @click="removeLogo">
                  Remove
                </UButton>
              </div>

              <!-- Upload button -->
              <div v-else>
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onLogoSelected">
                <UButton
variant="outline" icon="i-heroicons-arrow-up-tray" class="w-full"
                  @click="($refs.fileInput as HTMLInputElement).click()">
                  Upload Logo
                </UButton>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Max 500 KB. PNG, JPG, or GIF.
                </p>
              </div>
            </div>
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="isEditModalOpen = false" />
        <UButton label="Save Changes" :loading="isSaving" @click="saveWorkspace" />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Delete Workspace">
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong>{{ workspaceData?.workspace?.name }}</strong>?
          This action cannot be undone.
        </p>
        <p v-if="(workspaceData?.workspace?.userCount ?? 0) > 0" class="mt-3 text-amber-600 dark:text-amber-400">
          This workspace has {{ workspaceData?.workspace?.userCount }} users. You must remove all users before deleting.
        </p>
      </template>

      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="isDeleteModalOpen = false" />
        <UButton
label="Delete Workspace" color="error" :loading="isDeleting"
          :disabled="(workspaceData?.workspace?.userCount ?? 0) > 0" @click="deleteWorkspace" />
      </template>
    </UModal>
  </UDashboardPanel>
</template>
