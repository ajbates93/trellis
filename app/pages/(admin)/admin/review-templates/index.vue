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
                  :loading="archivingId === t.id"
                  @click="archive(t.id)"
                >
                  Archive
                </UButton>
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
const duplicatingId = ref<string | null>(null);
const archivingId = ref<string | null>(null);
const templates = ref<ReviewTemplateListItem[]>([]);

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const data = await $api<{ success: boolean; templates: ReviewTemplateListItem[] }>(
      "/admin/review-templates",
    );
    templates.value = data.templates;
  } catch (e) {
    console.error("Failed to load templates:", e);
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
  } finally {
    duplicatingId.value = null;
  }
};

const archive = async (id: string) => {
  archivingId.value = id;
  try {
    await $api(`/admin/review-templates/${id}`, { method: "DELETE" });
    await fetchTemplates();
    toast.add({
      title: "Template archived",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (e) {
    console.error("Failed to archive template:", e);
  } finally {
    archivingId.value = null;
  }
};

onMounted(fetchTemplates);
</script>
