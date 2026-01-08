<script setup lang="ts">
definePageMeta({
  middleware: ["super-admin"],
});

useHead({
  title: "Workspaces",
});

const { data: workspacesData, status, refresh } = useFetch("/api/super-admin/workspaces");

const isCreateModalOpen = ref(false);
const fileInput = ref<HTMLInputElement>();
const previewLogo = ref<string | null>(null);
const newWorkspace = ref({
  name: "",
  logoUrl: "",
  adminEmail: "",
  adminName: "",
});
const isCreating = ref(false);

const toast = useToast();

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
    newWorkspace.value.logoUrl = base64;
    previewLogo.value = base64;
  };
  reader.readAsDataURL(file);

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const removeLogo = () => {
  newWorkspace.value.logoUrl = "";
  previewLogo.value = null;
};

const createWorkspace = async () => {
  if (!newWorkspace.value.name) {
    toast.add({
      title: "Error",
      description: "Workspace name is required",
      color: "error",
    });
    return;
  }

  isCreating.value = true;

  try {
    await $fetch("/api/super-admin/workspaces", {
      method: "POST",
      body: {
        name: newWorkspace.value.name,
        logoUrl: newWorkspace.value.logoUrl || null,
        adminEmail: newWorkspace.value.adminEmail || undefined,
        adminName: newWorkspace.value.adminName || undefined,
      },
    });

    toast.add({
      title: "Success",
      description: `Workspace "${newWorkspace.value.name}" created successfully`,
      color: "success",
    });

    isCreateModalOpen.value = false;
    newWorkspace.value = { name: "", logoUrl: "", adminEmail: "", adminName: "" };
    previewLogo.value = null;
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.data?.message || "Failed to create workspace",
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <UDashboardPanel>
    <UDashboardNavbar title="Workspaces">
      <template #right>
        <UButton label="Create Workspace" icon="i-heroicons-plus" @click="isCreateModalOpen = true" />
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent class="pt-16 p-6 sm:pt-16 lg:pt-8">
      <div v-if="status === 'pending'" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <div v-else-if="workspacesData?.workspaces?.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-building-office-2" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No workspaces yet</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Create your first workspace to get started.</p>
        <UButton label="Create Workspace" icon="i-heroicons-plus" @click="isCreateModalOpen = true" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink v-for="workspace in workspacesData?.workspaces" :key="workspace.id"
          :to="`/workspaces/${workspace.id}`">
          <UCard class="hover:ring-2 hover:ring-primary transition-all cursor-pointer h-full">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <img v-if="workspace.logoUrl" :src="workspace.logoUrl" :alt="workspace.name"
                  class="w-10 h-10 rounded object-cover">
                <UIcon v-else name="i-heroicons-building-office-2" class="w-6 h-6 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold truncate">{{ workspace.name }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ workspace.userCount }} {{ workspace.userCount === 1 ? 'user' : 'users' }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Created {{ new Date(workspace.createdAt).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </UDashboardPanelContent>

    <!-- Create Workspace Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Create Workspace">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Workspace Name" required>
            <UInput v-model="newWorkspace.name" placeholder="Acme Corp" class="w-full" />
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
                <UButton variant="outline" icon="i-heroicons-arrow-up-tray" class="w-full"
                  @click="($refs.fileInput as HTMLInputElement).click()">
                  Upload Logo
                </UButton>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Max 500 KB. PNG, JPG, or GIF.
                </p>
              </div>
            </div>
          </UFormField>

          <div class="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              First Admin (Optional)
            </p>
            <div class="space-y-3">
              <UFormField label="Admin Email">
                <UInput v-model="newWorkspace.adminEmail" type="email" placeholder="admin@acme.com" class="w-full" />
              </UFormField>
              <UFormField label="Admin Name">
                <UInput v-model="newWorkspace.adminName" placeholder="John Doe" class="w-full" />
              </UFormField>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
        <UButton label="Create Workspace" :loading="isCreating" @click="createWorkspace" />
      </template>
    </UModal>
  </UDashboardPanel>
</template>
