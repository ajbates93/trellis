<script setup lang="ts">
import type { GoalMilestone } from "~/types";

const props = defineProps<{
  goalId: string;
  milestones: GoalMilestone[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const toast = useToast();

// Local state
const newMilestoneTitle = ref("");
const isAdding = ref(false);
const updatingIds = ref<Set<string>>(new Set());

// Add milestone
const addMilestone = async () => {
  if (!newMilestoneTitle.value.trim() || isAdding.value) return;

  isAdding.value = true;

  try {
    await $fetch(`/api/goals/${props.goalId}/milestones`, {
      method: "POST",
      body: { title: newMilestoneTitle.value.trim() },
    });

    newMilestoneTitle.value = "";
    emit("updated");
  } catch (error) {
    console.error("Failed to add milestone:", error);
    toast.add({
      title: "Failed to add milestone",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isAdding.value = false;
  }
};

// Toggle milestone completion
const toggleMilestone = async (milestone: GoalMilestone) => {
  if (props.readonly || updatingIds.value.has(milestone.id)) return;

  updatingIds.value.add(milestone.id);

  try {
    await $fetch(`/api/goals/${props.goalId}/milestones/${milestone.id}`, {
      method: "PATCH",
      body: { isCompleted: !milestone.isCompleted },
    });

    emit("updated");
  } catch (error) {
    console.error("Failed to update milestone:", error);
    toast.add({
      title: "Failed to update milestone",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    updatingIds.value.delete(milestone.id);
  }
};

// Delete milestone
const deleteMilestone = async (milestone: GoalMilestone) => {
  if (props.readonly || updatingIds.value.has(milestone.id)) return;

  updatingIds.value.add(milestone.id);

  try {
    const url = `/api/goals/${props.goalId}/milestones/${milestone.id}`;
    await $fetch(url, { method: "DELETE" });

    emit("updated");
  } catch (error) {
    console.error("Failed to delete milestone:", error);
    toast.add({
      title: "Failed to delete milestone",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    updatingIds.value.delete(milestone.id);
  }
};

// Handle enter key in input
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && newMilestoneTitle.value.trim()) {
    e.preventDefault();
    addMilestone();
  }
};

// Computed
const completedCount = computed(
  () => props.milestones.filter((m) => m.isCompleted).length
);
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <label class="block text-sm font-medium">
        Milestones
        <span v-if="milestones.length > 0" class="text-gray-500 font-normal">
          ({{ completedCount }}/{{ milestones.length }})
        </span>
      </label>
    </div>

    <!-- Milestone List -->
    <div v-if="milestones.length > 0" class="space-y-1">
      <div
        v-for="milestone in milestones"
        :key="milestone.id"
        class="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <!-- Checkbox -->
        <button
          v-if="!readonly"
          type="button"
          class="flex-shrink-0 focus:outline-none"
          :disabled="updatingIds.has(milestone.id)"
          @click="toggleMilestone(milestone)"
        >
          <div
            v-if="!milestone.isCompleted"
            :class="[
              'w-5 h-5 rounded-full border-2 border-gray-400 hover:border-green-500 transition-colors',
              updatingIds.has(milestone.id) ? 'opacity-50' : '',
            ]"
          />
          <UIcon
            v-else
            name="i-heroicons-check-circle-solid"
            :class="[
              'w-5 h-5 text-green-500 transition-colors',
              updatingIds.has(milestone.id) ? 'opacity-50' : '',
            ]"
          />
        </button>

        <!-- Read-only icon -->
        <div v-else class="flex-shrink-0">
          <UIcon
            v-if="milestone.isCompleted"
            name="i-heroicons-check-circle-solid"
            class="w-5 h-5 text-green-500"
          />
          <div
            v-else
            class="w-5 h-5 rounded-full border-2 border-gray-400"
          />
        </div>

        <!-- Title -->
        <span
          :class="[
            'flex-1 text-sm',
            milestone.isCompleted ? 'line-through text-gray-500' : '',
          ]"
        >
          {{ milestone.title }}
        </span>

        <!-- Delete button -->
        <button
          v-if="!readonly"
          type="button"
          class="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
          :disabled="updatingIds.has(milestone.id)"
          @click="deleteMilestone(milestone)"
        >
          <UIcon
            name="i-heroicons-x-mark"
            class="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors"
          />
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="readonly"
      class="text-sm text-gray-500 italic py-2"
    >
      No milestones
    </div>

    <!-- Add milestone input -->
    <div v-if="!readonly" class="flex items-center gap-2">
      <UInput
        v-model="newMilestoneTitle"
        placeholder="Add a milestone..."
        size="sm"
        class="flex-1"
        :maxlength="200"
        :disabled="isAdding"
        @keydown="handleKeydown"
      />
      <UButton
        icon="i-heroicons-plus"
        size="sm"
        variant="soft"
        :loading="isAdding"
        :disabled="!newMilestoneTitle.trim()"
        @click="addMilestone"
      >
        Add
      </UButton>
    </div>

    <!-- Help text -->
    <p v-if="!readonly && milestones.length === 0" class="text-xs text-gray-500">
      Break down your goal into smaller steps to track progress
    </p>
  </div>
</template>
