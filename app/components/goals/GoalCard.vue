<script setup lang="ts">
import { format, differenceInDays, isPast, isToday } from "date-fns";
import type { GoalMilestone, GoalWithMilestones } from "~/types";

const { sanitize } = useSanitizeHtml();

const props = defineProps<{
  goal: GoalWithMilestones;
  mode: "owner" | "buddy";
  ownerName?: string;
}>();

// Computed properties for milestones
const milestoneCount = computed(() => props.goal.milestones?.length ?? 0);
const completedMilestones = computed(
  () => props.goal.milestones?.filter((m) => m.isCompleted).length ?? 0
);
const milestoneProgress = computed(() =>
  milestoneCount.value > 0
    ? (completedMilestones.value / milestoneCount.value) * 100
    : 0
);

// Date urgency calculation
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

const dateUrgency = computed<{ color: BadgeColor; label: string; icon: string; daysUntil?: number }>(() => {
  if (!props.goal.targetDate) return { color: 'neutral', label: 'No target date', icon: 'i-heroicons-calendar' };

  const targetDate = new Date(props.goal.targetDate);
  const today = new Date();
  const daysUntil = differenceInDays(targetDate, today);

  if (isPast(targetDate) && !isToday(targetDate)) {
    return { color: 'error', label: 'Overdue', icon: 'i-heroicons-exclamation-circle', daysUntil };
  }
  if (isToday(targetDate)) {
    return { color: 'warning', label: 'Due today', icon: 'i-heroicons-clock', daysUntil: 0 };
  }
  if (daysUntil <= 7) {
    return { color: 'warning', label: `${daysUntil} days left`, icon: 'i-heroicons-clock', daysUntil };
  }
  if (daysUntil <= 30) {
    return { color: 'primary', label: `${daysUntil} days left`, icon: 'i-heroicons-calendar', daysUntil };
  }
  return { color: 'success', label: `${daysUntil} days left`, icon: 'i-heroicons-calendar', daysUntil };
});

// Strip HTML tags for description preview
const descriptionPreview = computed(() => {
  if (!props.goal.description) return null;
  const stripped = props.goal.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > 100 ? stripped.substring(0, 100) + '...' : stripped;
});

const emit = defineEmits<{
  statusChanged: [];
  deleted: [];
  updated: [];
}>();

const toast = useToast();

// State
const showNotes = ref(false);
const isUpdatingStatus = ref(false);
const isDeleting = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);

// Actions
const changeStatus = async (newStatus: string) => {
  isUpdatingStatus.value = true;

  try {
    await $api(`/goals/${props.goal.id}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    });

    emit("statusChanged");

    const statusLabels: Record<string, string> = {
      active: "reactivated",
      completed: "marked as complete",
      archived: "archived",
    };

    toast.add({
      title: "Goal updated",
      description: `Goal ${statusLabels[newStatus] || "updated"} successfully.`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to update status:", error);
    toast.add({
      title: "Failed to update status",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isUpdatingStatus.value = false;
  }
};

const deleteGoal = async () => {
  if (!confirm("Are you sure you want to delete this goal?")) return;

  isDeleting.value = true;

  try {
    await $api(`/goals/${props.goal.id}`, {
      method: "DELETE",
    });

    emit("deleted");

    toast.add({
      title: "Goal deleted",
      description: "The goal has been permanently removed.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to delete goal:", error);
    toast.add({
      title: "Failed to delete goal",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isDeleting.value = false;
  }
};

const handleGoalUpdated = () => {
  emit("updated");
};

// Format target date
const formatTargetDate = (dateString: string | null) => {
  if (!dateString) return "No target date";
  return format(new Date(dateString), "MMM d, yyyy");
};

// Action menu items (for owner mode)
const actionMenuItems = computed(() => {
  const items = [];

  if (props.mode === "owner") {
    items.push({
      label: "Edit",
      icon: "i-heroicons-pencil",
      onSelect: () => {
        showEditModal.value = true;
      },
    });

    // Add Archive option for active/completed goals
    if (props.goal.status === 'active' || props.goal.status === 'completed') {
      items.push({
        label: "Archive",
        icon: "i-heroicons-archive-box",
        onSelect: () => changeStatus('archived'),
      });
    }

    // Add Reactivate option for archived/completed goals
    if (props.goal.status === 'archived' || props.goal.status === 'completed') {
      items.push({
        label: "Reactivate",
        icon: "i-heroicons-arrow-path",
        onSelect: () => changeStatus('active'),
      });
    }

    items.push({
      label: "Delete",
      icon: "i-heroicons-trash",
      click: deleteGoal,
    });
  }

  return items;
});
</script>

<template>
  <UCard
    class="hover:shadow-lg transition-all duration-200 hover:ring-primary/30"
  >
    <div class="space-y-4">
      <!-- Goal Header with Progress Ring -->
      <div class="flex gap-4">
        <!-- Circular Progress (if milestones exist) -->
        <div
          v-if="milestoneCount > 0"
          class="flex-shrink-0 relative w-14 h-14 cursor-pointer"
          @click="showViewModal = true"
        >
          <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <!-- Background circle -->
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
              class="text-gray-200 dark:text-gray-700"
            />
            <!-- Progress circle -->
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
              :stroke-dasharray="150.8"
              :stroke-dashoffset="150.8 - (150.8 * milestoneProgress) / 100"
              stroke-linecap="round"
              :class="milestoneProgress === 100 ? 'text-success' : 'text-primary'"
              class="transition-all duration-500"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {{ Math.round(milestoneProgress) }}%
            </span>
          </div>
        </div>

        <!-- Goal Info -->
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start gap-2">
            <button class="text-left flex-1 group" @click="showViewModal = true">
              <p
                class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-2"
              >
                {{ goal.goalText }}
              </p>
            </button>

            <!-- Action Menu (owner mode only) -->
            <UDropdownMenu
              v-if="mode === 'owner' && actionMenuItems.length > 0"
              :items="[actionMenuItems]"
            >
              <UButton
                icon="i-heroicons-ellipsis-vertical"
                variant="ghost"
                color="neutral"
                size="xs"
              />
            </UDropdownMenu>
          </div>

          <!-- Meta info row -->
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <!-- Target Date Badge with urgency colors -->
            <UBadge
              :color="dateUrgency.color"
              variant="subtle"
              size="sm"
            >
              <template #leading>
                <UIcon :name="dateUrgency.icon" class="w-3 h-3" />
              </template>
              {{ goal.targetDate ? formatTargetDate(goal.targetDate) : dateUrgency.label }}
            </UBadge>

            <!-- Urgency indicator for dates -->
            <span
              v-if="goal.targetDate && goal.status === 'active'"
              class="text-xs"
              :class="{
                'text-red-500': dateUrgency.color === 'error',
                'text-amber-500': dateUrgency.color === 'warning',
                'text-primary': dateUrgency.color === 'primary',
                'text-success': dateUrgency.color === 'success',
              }"
            >
              {{ dateUrgency.label }}
            </span>

            <!-- Milestone count (when no progress ring) -->
            <UBadge
              v-if="milestoneCount > 0"
              color="neutral"
              variant="outline"
              size="sm"
            >
              {{ completedMilestones }}/{{ milestoneCount }} milestones
            </UBadge>

            <!-- Owner Badge (buddy mode) -->
            <UBadge
              v-if="mode === 'buddy' && ownerName"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ ownerName }}
            </UBadge>
          </div>

          <!-- Description Preview -->
          <p
            v-if="descriptionPreview"
            class="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2"
          >
            {{ descriptionPreview }}
          </p>
        </div>
      </div>

      <!-- Primary Action Button (simplified) -->
      <div v-if="mode === 'owner'" class="flex items-center gap-3">
        <!-- Active Goal: Single prominent action -->
        <UButton
          v-if="goal.status === 'active'"
          size="sm"
          variant="soft"
          color="success"
          icon="i-heroicons-check-circle"
          :loading="isUpdatingStatus"
          class="transition-all"
          @click="changeStatus('completed')"
        >
          Mark Complete
        </UButton>

        <!-- Completed Goal: Show completion state -->
        <div v-else-if="goal.status === 'completed'" class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-badge" class="w-5 h-5 text-success" />
          <span class="text-sm text-success font-medium">Completed</span>
        </div>

        <!-- Archived Goal: Muted state -->
        <div v-else-if="goal.status === 'archived'" class="flex items-center gap-2">
          <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-gray-400" />
          <span class="text-sm text-gray-500 font-medium">Archived</span>
        </div>

        <!-- Notes toggle moved to right -->
        <div class="ml-auto">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="showNotes ? 'i-heroicons-chevron-up' : 'i-heroicons-chat-bubble-left-ellipsis'"
            @click="showNotes = !showNotes"
          >
            {{ showNotes ? "Hide Notes" : "Notes" }}
          </UButton>
        </div>
      </div>

      <!-- Notes Section (Expandable) -->
      <div
        v-if="showNotes"
        class="pt-3 border-t border-gray-200 dark:border-gray-700"
      >
        <GoalsGoalNoteThread :goal-id="goal.id" :can-add-note="true" />
      </div>
    </div>

    <!-- View Modal -->
    <UModal
      v-model:open="showViewModal"
      :title="goal.goalText"
      class="sm:max-w-2xl"
    >
      <template #body>
        <div class="space-y-6">
          <!-- Header with status and progress -->
          <div class="flex items-center justify-between">
            <UBadge
              :color="
                goal.status === 'active'
                  ? 'success'
                  : goal.status === 'completed'
                    ? 'primary'
                    : 'neutral'
              "
              size="md"
            >
            {{ goal.status ? goal.status.charAt(0).toUpperCase() + goal.status.slice(1) : '' }}
            </UBadge>

            <!-- Progress ring in modal -->
            <div v-if="milestoneCount > 0" class="flex items-center gap-3">
              <div class="relative w-12 h-12">
                <svg class="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                    class="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                    :stroke-dasharray="125.6"
                    :stroke-dashoffset="125.6 - (125.6 * milestoneProgress) / 100"
                    stroke-linecap="round"
                    :class="milestoneProgress === 100 ? 'text-success' : 'text-primary'"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xs font-bold">{{ Math.round(milestoneProgress) }}%</span>
                </div>
              </div>
              <div class="text-sm">
                <p class="font-medium">{{ completedMilestones }}/{{ milestoneCount }}</p>
                <p class="text-gray-500 text-xs">milestones</p>
              </div>
            </div>
          </div>

          <!-- Target Date with urgency -->
          <div
            v-if="goal.targetDate"
            class="flex items-center gap-3 p-3 rounded-lg"
            :class="{
              'bg-red-50 dark:bg-red-900/20': dateUrgency.color === 'error',
              'bg-amber-50 dark:bg-amber-900/20': dateUrgency.color === 'warning',
              'bg-blue-50 dark:bg-blue-900/20': dateUrgency.color === 'primary',
              'bg-green-50 dark:bg-green-900/20': dateUrgency.color === 'success',
            }"
          >
            <UIcon
              :name="dateUrgency.icon"
              class="w-5 h-5"
              :class="{
                'text-red-500': dateUrgency.color === 'error',
                'text-amber-500': dateUrgency.color === 'warning',
                'text-primary': dateUrgency.color === 'primary',
                'text-success': dateUrgency.color === 'success',
              }"
            />
            <div>
              <p class="font-medium">{{ formatTargetDate(goal.targetDate) }}</p>
              <p
                class="text-sm"
                :class="{
                  'text-red-600 dark:text-red-400': dateUrgency.color === 'error',
                  'text-amber-600 dark:text-amber-400': dateUrgency.color === 'warning',
                  'text-blue-600 dark:text-blue-400': dateUrgency.color === 'primary',
                  'text-green-600 dark:text-green-400': dateUrgency.color === 'success',
                }"
              >
                {{ dateUrgency.label }}
              </p>
            </div>
          </div>

          <!-- Description -->
          <div v-if="goal.description">
            <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
            <div
              class="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              v-html="sanitize(goal.description)"
            />
          </div>

          <!-- Milestones -->
          <div v-if="milestoneCount > 0">
            <label class="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              Milestones
            </label>
            <div class="space-y-2">
              <div
                v-for="milestone in goal.milestones"
                :key="milestone.id"
                class="flex items-center gap-3 p-3 rounded-lg transition-colors"
                :class="milestone.isCompleted
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'bg-gray-50 dark:bg-gray-800'"
              >
                <UIcon
                  v-if="milestone.isCompleted"
                  name="i-heroicons-check-circle-solid"
                  class="w-6 h-6 flex-shrink-0 text-success"
                />
                <div
                  v-else
                  class="w-6 h-6 flex-shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600"
                />
                <span
                  :class="milestone.isCompleted
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-gray-100'"
                  class="text-sm font-medium"
                >
                  {{ milestone.title }}
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state for no description and no milestones -->
          <div
            v-if="!goal.description && milestoneCount === 0"
            class="text-center py-6 text-gray-500"
          >
            <UIcon name="i-heroicons-document-text" class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">No description or milestones yet.</p>
            <p class="text-xs mt-1">Click "Edit Goal" to add details.</p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between w-full">
          <UButton color="neutral" variant="ghost" @click="showViewModal = false">
            Close
          </UButton>
          <UButton
            v-if="mode === 'owner'"
            icon="i-heroicons-pencil"
            @click="
              showViewModal = false;
              showEditModal = true;
            "
          >
            Edit Goal
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <GoalsGoalModal
      v-if="mode === 'owner'"
      :is-open="showEditModal"
      :goal="goal"
      mode="edit"
      @update:is-open="showEditModal = $event"
      @success="handleGoalUpdated"
    />
  </UCard>
</template>

<style scoped>
/* Task list styling for description display */
:deep(ul[data-type="taskList"]) {
  list-style: none;
  padding: 0;
}

:deep(ul[data-type="taskList"] li) {
  display: flex;
  align-items: start;
  gap: 0.5rem;
  margin: 0.25rem 0;
}

:deep(ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-top: 0.125rem;
  user-select: none;
}

:deep(ul[data-type="taskList"] li > div) {
  flex: 1 1 auto;
}

:deep(ul[data-type="taskList"] li > div > p) {
  margin: 0;
}

:deep(ul[data-type="taskList"] input[type="checkbox"]) {
  cursor: pointer;
  width: 1rem;
  height: 1rem;
}

/* Regular bullet/numbered lists */
:deep(.prose ul:not([data-type="taskList"])) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

:deep(.prose ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

:deep(.prose ul:not([data-type="taskList"]) li),
:deep(.prose ol li) {
  margin: 0.25rem 0;
  padding-left: 0.25rem;
}

/* General prose styling */
:deep(.prose p) {
  margin: 0.5rem 0;
}

:deep(.prose p:first-child) {
  margin-top: 0;
}
</style>
