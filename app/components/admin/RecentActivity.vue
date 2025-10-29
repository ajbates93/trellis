<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h3>
        <UIcon name="i-heroicons-clock" class="text-primary text-xl" />
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-gray-400" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-64 text-red-500">
      <p>Failed to load activity</p>
    </div>

    <div v-else class="space-y-3 max-h-96 overflow-y-auto">
      <div
        v-for="item in activity"
        :key="item.id"
        class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div class="flex-shrink-0 mt-0.5">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center"
            :class="{
              'bg-blue-500/10': item.type === 'feedback',
              'bg-green-500/10': item.type === 'goal',
            }"
          >
            <UIcon
              :name="item.type === 'feedback' ? 'i-heroicons-chat-bubble-left-right' : 'i-heroicons-flag'"
              :class="{
                'text-blue-500': item.type === 'feedback',
                'text-green-500': item.type === 'goal',
              }"
              class="text-lg"
            />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 dark:text-white">
            <template v-if="item.type === 'feedback'">
              <span class="font-medium">{{ item.metadata.reviewerName }}</span>
              gave feedback to
              <span class="font-medium">{{ item.metadata.revieweeName }}</span>
              <UBadge
                v-if="!item.metadata.published"
                color="amber"
                variant="subtle"
                size="xs"
                class="ml-2"
              >
                Unpublished
              </UBadge>
            </template>
            <template v-else>
              <span class="font-medium">{{ item.metadata.userName }}</span>
              created a goal
              <UBadge
                :color="item.metadata.status === 'completed' ? 'green' : 'blue'"
                variant="subtle"
                size="xs"
                class="ml-2"
              >
                {{ item.metadata.status }}
              </UBadge>
            </template>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {{ item.content }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {{ formatDate(item.createdAt) }}
          </p>
        </div>
      </div>

      <div v-if="activity.length === 0" class="text-center py-8 text-gray-500">
        No recent activity
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

const loading = ref(true);
const error = ref(false);
const activity = ref<any[]>([]);

const formatDate = (date: string | Date | null) => {
  if (!date) return "Unknown";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

onMounted(async () => {
  try {
    const data = await $fetch("/api/admin/recent-activity");

    if (data) {
      activity.value = data.activity;
    }
  } catch (e) {
    console.error("Failed to load recent activity:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
