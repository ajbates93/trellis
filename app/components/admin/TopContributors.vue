<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Top Contributors
        </h3>
        <UIcon name="i-heroicons-trophy" class="text-amber-500 text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-64 text-red-500">
      <p>Failed to load contributors</p>
    </div>

    <div v-else class="space-y-3 max-h-96 overflow-y-auto">
      <div
        v-for="(contributor, index) in contributors"
        :key="contributor.userId"
        class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <div
              v-if="index < 3"
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              :class="{
                'bg-amber-500 text-white': index === 0,
                'bg-gray-400 text-white': index === 1,
                'bg-amber-700 text-white': index === 2,
              }"
            >
              {{ index + 1 }}
            </div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              {{ index + 1 }}
            </div>
          </div>

          <UAvatar
            :src="contributor.avatarUrl || contributor.image"
            :alt="contributor.name"
            size="sm"
          />

          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ contributor.name }}
            </p>
            <p v-if="contributor.roleType" class="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {{ contributor.roleType }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">
            {{ contributor.feedbackCount }} feedback
          </UBadge>
        </div>
      </div>

      <div v-if="contributors.length === 0" class="text-center py-8 text-gray-500">
        No feedback activity yet
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const loading = ref(true);
const error = ref(false);
const contributors = ref<any[]>([]);

onMounted(async () => {
  try {
    const data = await $api("/admin/top-contributors");

    if (data) {
      contributors.value = data.contributors;
    }
  } catch (e) {
    console.error("Failed to load top contributors:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
