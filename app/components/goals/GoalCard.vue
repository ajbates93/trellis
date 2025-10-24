<script setup lang="ts">
import { format } from "date-fns";

const props = defineProps<{
  goal: {
    id: string;
    goalText: string;
    status: string | null;
    targetDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    completedAt: string | null;
  };
  mode: "owner" | "buddy";
  ownerName?: string;
}>();

const emit = defineEmits<{
  statusChanged: [];
  deleted: [];
  updated: [];
}>();

// State
const showNotes = ref(false);
const isUpdatingStatus = ref(false);
const isDeleting = ref(false);
const showEditModal = ref(false);

// Actions
const changeStatus = async (newStatus: string) => {
  isUpdatingStatus.value = true;

  try {
    await $fetch(`/api/goals/${props.goal.id}/status`, {
      method: "PATCH",
      body: { status: newStatus },
    });

    emit("statusChanged");
  } catch (error) {
    console.error("Failed to update status:", error);
    alert("Failed to update status. Please try again.");
  } finally {
    isUpdatingStatus.value = false;
  }
};

const deleteGoal = async () => {
  if (!confirm("Are you sure you want to delete this goal?")) return;

  isDeleting.value = true;

  try {
    await $fetch(`/api/goals/${props.goal.id}`, {
      method: "DELETE",
    });

    emit("deleted");
  } catch (error) {
    console.error("Failed to delete goal:", error);
    alert("Failed to delete goal. Please try again.");
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
      click: () => {
        showEditModal.value = true;
      },
    });

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
  <UCard class="hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
    <div class="space-y-3">
      <!-- Goal Header -->
      <div class="flex justify-between items-start gap-2">
        <div class="flex-1">
          <p class="text-base font-medium text-gray-900 dark:text-gray-100">
            {{ goal.goalText }}
          </p>
          <div class="flex items-center gap-2 mt-2">
            <!-- Target Date Badge -->
            <UBadge
              :color="goal.targetDate ? 'blue' : 'gray'"
              variant="subtle"
              size="sm"
            >
              <template #icon>
                <UIcon name="i-heroicons-calendar" />
              </template>
              {{ formatTargetDate(goal.targetDate) }}
            </UBadge>

            <!-- Owner Badge (buddy mode) -->
            <UBadge
              v-if="mode === 'buddy' && ownerName"
              color="gray"
              variant="subtle"
              size="xs"
            >
              {{ ownerName }}
            </UBadge>
          </div>
        </div>

        <!-- Action Menu (owner mode only) -->
        <UDropdown
          v-if="mode === 'owner' && actionMenuItems.length > 0"
          :items="[actionMenuItems]"
        >
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            variant="ghost"
            color="gray"
            size="xs"
          />
        </UDropdown>
      </div>

      <!-- Action Buttons -->
      <div v-if="mode === 'owner'" class="flex gap-2 flex-wrap">
        <!-- Active Goal Actions -->
        <template v-if="goal.status === 'active'">
          <UButton
            size="sm"
            variant="soft"
            color="green"
            icon="i-heroicons-check-circle"
            :loading="isUpdatingStatus"
            @click="changeStatus('completed')"
            class="hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            Mark Complete
          </UButton>
          <UButton
            size="sm"
            variant="soft"
            color="gray"
            icon="i-heroicons-archive-box"
            :loading="isUpdatingStatus"
            @click="changeStatus('archived')"
            class="hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Archive
          </UButton>
        </template>

        <!-- Completed Goal Actions -->
        <template v-else-if="goal.status === 'completed'">
          <UButton
            size="sm"
            variant="soft"
            color="blue"
            icon="i-heroicons-arrow-path"
            :loading="isUpdatingStatus"
            @click="changeStatus('active')"
            class="hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Reactivate
          </UButton>
          <UButton
            size="sm"
            variant="soft"
            color="gray"
            icon="i-heroicons-archive-box"
            :loading="isUpdatingStatus"
            @click="changeStatus('archived')"
            class="hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Archive
          </UButton>
        </template>

        <!-- Archived Goal Actions -->
        <template v-else-if="goal.status === 'archived'">
          <UButton
            size="sm"
            variant="soft"
            color="blue"
            icon="i-heroicons-arrow-path"
            :loading="isUpdatingStatus"
            @click="changeStatus('active')"
            class="hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Reactivate
          </UButton>
        </template>
      </div>

      <!-- Toggle Notes Button -->
      <div>
        <UButton
          size="xs"
          variant="ghost"
          :icon="showNotes ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          @click="showNotes = !showNotes"
        >
          {{ showNotes ? "Hide" : "Show" }} Notes
        </UButton>
      </div>

      <!-- Notes Section (Expandable) -->
      <div v-if="showNotes" class="pt-3 border-t border-gray-200 dark:border-gray-700">
        <GoalsGoalNoteThread
          :goal-id="goal.id"
          :can-add-note="true"
        />
      </div>
    </div>

    <!-- Edit Modal -->
    <GoalsGoalModal
      v-if="mode === 'owner'"
      :is-open="showEditModal"
      @update:is-open="showEditModal = $event"
      :goal="goal"
      mode="edit"
      @success="handleGoalUpdated"
    />
  </UCard>
</template>
