<script setup lang="ts">
import { format } from "date-fns";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

// Fetch all achievements
const { data, status } = await useApi("/achievements");

const achievements = computed(() => {
  const items = data.value?.achievements || [];
  // Sort by most recent first
  return [...items].sort((a, b) => {
    return (
      new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime()
    );
  });
});

const formatDate = (date: string) => {
  return format(new Date(date), "MMM d, yyyy");
};

// Table columns
const columns = [
  { accessorKey: "title", header: "Achievement" },
  { accessorKey: "achievedDate", header: "Date" },
];

// Expanded row state
const expandedRows = ref<Set<string>>(new Set());

const toggleRow = (id: string) => {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id);
  } else {
    expandedRows.value.add(id);
  }
  // Trigger reactivity
  expandedRows.value = new Set(expandedRows.value);
};

const isExpanded = (id: string) => expandedRows.value.has(id);
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    title="Brag Bucket"
    description="Your achievements and wins"
    side="right"
  >
    <template #body>
      <div v-if="status === 'pending'" class="space-y-4">
        <div v-for="i in 3" :key="i" class="animate-pulse">
          <div
            class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"
          />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"/>
        </div>
      </div>

      <div v-else-if="achievements.length === 0" class="text-center py-12">
        <UIcon
          name="i-heroicons-trophy"
          class="w-12 h-12 mx-auto text-gray-400 mb-4"
        />
        <p class="text-gray-600 dark:text-gray-400">
          No achievements yet. Start adding to your brag bucket!
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="achievement in achievements"
          :key="achievement.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <button
            class="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="toggleRow(achievement.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ achievement.title }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(achievement.achievedDate) }}
                </p>
              </div>
              <UIcon
                :name="
                  isExpanded(achievement.id)
                    ? 'i-heroicons-chevron-up'
                    : 'i-heroicons-chevron-down'
                "
                class="w-5 h-5 text-gray-400 flex-shrink-0"
              />
            </div>
          </button>

          <div
            v-if="isExpanded(achievement.id) && achievement.description"
            class="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <p
              class="text-sm text-gray-700 dark:text-gray-300 pt-3 whitespace-pre-wrap"
            >
              {{ achievement.description }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ achievements.length }} achievement{{
            achievements.length !== 1 ? "s" : ""
          }}
        </span>
        <NuxtLink to="/brag-bucket" @click="isOpen = false">
          <UButton
            variant="ghost"
            color="primary"
            icon="i-heroicons-arrow-right"
            trailing
          >
            View Full Brag Bucket
          </UButton>
        </NuxtLink>
      </div>
    </template>
  </USlideover>
</template>
