<template>
  <UDashboardPanel id="admin-review-templates">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Header -->
        <div class="mb-8 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-heroicons-clipboard-document-list" class="text-purple-500 text-3xl" />
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Review Templates
              </h1>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Configure the reflection questions buddies can pick when scheduling a review.
            </p>
          </div>
          <UButton icon="i-heroicons-plus" color="primary" to="/admin/review-templates/new">
            New Template
          </UButton>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="py-12 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>

        <!-- Error -->
        <div v-else-if="error" class="py-12 text-center">
          <div class="flex flex-col items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-red-500 text-3xl" />
            <p class="text-gray-600 dark:text-gray-400">
              Failed to load review templates.
            </p>
            <UButton color="neutral" variant="subtle" icon="i-heroicons-arrow-path" @click="fetchTemplates">
              Try again
            </UButton>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="templates.length === 0"
          class="py-12 text-center text-gray-500 dark:text-gray-400"
        >
          No review templates yet. Create one to get started.
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <UCard v-for="t in templates" :key="t.id">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-900 dark:text-white">{{ t.name }}</span>
                  <UBadge v-if="t.isDefault" color="neutral" variant="subtle">Default</UBadge>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t.fields.length }} field{{ t.fields.length === 1 ? "" : "s" }}
                  <span v-if="t.description"> · {{ t.description }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  :to="`/admin/review-templates/${t.id}`"
                >
                  Edit
                </UButton>
                <UButton
                  variant="ghost"
                  icon="i-heroicons-document-duplicate"
                  :loading="duplicatingId === t.id"
                  @click="duplicate(t.id)"
                >
                  Duplicate
                </UButton>
                <UButton
                  v-if="!t.isDefault"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-archive-box"
                  @click="openArchiveModal(t)"
                >
                  Archive
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Archive Template Confirmation Modal -->
      <UModal
        v-model:open="showArchiveModal"
        title="Archive Template"
        :description="`Are you sure you want to archive ${templateToArchive?.name}? This action cannot be undone.`"
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
                <p class="font-medium mb-1">Once archived:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>Buddies will no longer be able to pick this template for new reviews</li>
                  <li>Existing reviews keep their snapshot and are unaffected</li>
                </ul>
              </div>
            </div>

            <div
              v-if="templateToArchive"
              class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <UIcon
                name="i-heroicons-clipboard-document-list"
                class="text-purple-500 text-xl flex-shrink-0"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ templateToArchive.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ templateToArchive.fields.length }}
                  field{{ templateToArchive.fields.length === 1 ? "" : "s" }}
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
              :disabled="archivingId === templateToArchive?.id"
              @click="showArchiveModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="archivingId === templateToArchive?.id"
              @click="confirmArchive"
            >
              Archive Template
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Review Templates",
});

interface ReviewTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  fields: unknown[];
}

const toast = useToast();
const loading = ref(true);
const error = ref(false);
const duplicatingId = ref<string | null>(null);
const archivingId = ref<string | null>(null);
const templates = ref<ReviewTemplateListItem[]>([]);
const showArchiveModal = ref(false);
const templateToArchive = ref<ReviewTemplateListItem | null>(null);

const fetchTemplates = async () => {
  loading.value = true;
  error.value = false;
  try {
    const data = await $api<{ success: boolean; templates: ReviewTemplateListItem[] }>(
      "/admin/review-templates",
    );
    templates.value = data.templates;
  } catch (e) {
    console.error("Failed to load templates:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

const duplicate = async (id: string) => {
  duplicatingId.value = id;
  try {
    await $api(`/admin/review-templates/${id}/duplicate`, { method: "POST" });
    await fetchTemplates();
    toast.add({
      title: "Template duplicated",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (e) {
    console.error("Failed to duplicate template:", e);
    toast.add({
      title: "Failed to duplicate template",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    duplicatingId.value = null;
  }
};

const openArchiveModal = (template: ReviewTemplateListItem) => {
  templateToArchive.value = template;
  showArchiveModal.value = true;
};

const confirmArchive = async () => {
  if (!templateToArchive.value) return;

  archivingId.value = templateToArchive.value.id;
  try {
    await $api(`/admin/review-templates/${templateToArchive.value.id}`, { method: "DELETE" });
    await fetchTemplates();
    toast.add({
      title: "Template archived",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
    showArchiveModal.value = false;
    templateToArchive.value = null;
  } catch (e: any) {
    console.error("Failed to archive template:", e);
    toast.add({
      title: "Failed to archive template",
      description: e?.data?.message,
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    archivingId.value = null;
  }
};

onMounted(fetchTemplates);
</script>
