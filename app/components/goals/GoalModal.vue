<script setup lang="ts">
import type { GoalWithMilestones, GoalMilestone } from "~/types";

const props = defineProps<{
  isOpen: boolean;
  goal?: GoalWithMilestones | null;
  mode: "create" | "edit";
}>();

const emit = defineEmits<{
  close: [];
  success: [goal: GoalWithMilestones];
  "update:isOpen": [value: boolean];
}>();

const toast = useToast();
const { markTaskComplete } = useOnboarding();

// Local computed for v-model
const isOpen = computed({
  get: () => props.isOpen,
  set: (value: boolean) => emit("update:isOpen", value),
});

// Form state
const goalText = ref(props.goal?.goalText || "");
const description = ref(props.goal?.description || "");
const targetDate = ref(props.goal?.targetDate || null);
const milestones = ref<GoalMilestone[]>(props.goal?.milestones || []);
const isSubmitting = ref(false);

// Handle milestone updates (refetch goal data)
const handleMilestonesUpdated = async () => {
  if (!props.goal?.id) return;

  try {
    const { goals } = await $fetch<{ goals: GoalWithMilestones[] }>("/api/goals");
    const updatedGoal = goals.find((g) => g.id === props.goal?.id);
    if (updatedGoal?.milestones) {
      milestones.value = updatedGoal.milestones;
    }
    // Also emit success to update the parent
    emit("success", updatedGoal);
  } catch (error) {
    console.error("Failed to refresh milestones:", error);
  }
};

// Validation
const isFormValid = computed(() => {
  return goalText.value.trim().length >= 10 && goalText.value.length <= 500;
});

const charCount = computed(() => goalText.value.length);

// Submit handler
const handleSubmit = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    if (props.mode === "create") {
      const { goal } = await $fetch("/api/goals", {
        method: "POST",
        body: {
          goalText: goalText.value.trim(),
          description: description.value || null,
          targetDate: targetDate.value || null,
        },
      });
      emit("success", goal);

      // Mark onboarding task as complete
      markTaskComplete("create-goal");

      toast.add({
        title: "Goal created",
        description: "Your new goal has been added successfully.",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else if (props.mode === "edit" && props.goal) {
      const { goal } = await $fetch(`/api/goals/${props.goal.id}`, {
        method: "PATCH",
        body: {
          goalText: goalText.value.trim(),
          description: description.value || null,
          targetDate: targetDate.value || null,
        },
      });
      emit("success", goal);
      toast.add({
        title: "Goal updated",
        description: "Your changes have been saved successfully.",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }

    isOpen.value = false;
  } catch (error) {
    console.error("Failed to save goal:", error);
    toast.add({
      title:
        props.mode === "create"
          ? "Failed to create goal"
          : "Failed to update goal",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Update form when modal opens or props change
watch(
  () => props.goal,
  (newGoal) => {
    if (newGoal) {
      goalText.value = newGoal.goalText || "";
      description.value = newGoal.description || "";
      targetDate.value = newGoal.targetDate || null;
      milestones.value = newGoal.milestones || [];
    }
  },
  { immediate: true }
);

// Reset form when modal closes
watch(isOpen, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Modal opening - load props
    goalText.value = props.goal?.goalText || "";
    description.value = props.goal?.description || "";
    targetDate.value = props.goal?.targetDate || null;
    milestones.value = props.goal?.milestones || [];
  } else if (!newVal && oldVal) {
    // Modal closing - reset to empty for create mode, or original values for edit mode
    goalText.value = props.goal?.goalText || "";
    description.value = props.goal?.description || "";
    targetDate.value = props.goal?.targetDate || null;
    milestones.value = props.goal?.milestones || [];
  }
});
</script>

<template>
  <UModal
    v-model:open="isOpen"
    class="sm:max-w-2xl"
    :title="mode === 'create' ? 'Create New Goal' : 'Edit Goal'"
    :ui="{
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Goal Title -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Title <span class="text-red-500">*</span>
          </label>
          <UInput
            v-model="goalText"
            placeholder="e.g., Improve public speaking skills"
            class="w-full"
            :maxlength="500"
            autofocus
            size="lg"
          />
          <div
            v-if="goalText.length > 0"
            class="flex justify-between mt-1 text-xs text-gray-500"
          >
            <span v-if="goalText.length < 10" class="text-red-500">
              Minimum 10 characters
            </span>
            <span v-else class="text-green-500"> ✓ Valid </span>
            <span :class="{ 'text-red-500': charCount > 500 }">
              {{ charCount }}/500
            </span>
          </div>
          <div v-else class="h-[20px]"/>
        </div>

        <!-- Description (Rich Text) -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Description (Optional)
          </label>
          <p class="text-xs text-gray-500 mb-2">
            Add details, bullet points, or checklist items to track your
            progress
          </p>
          <GoalsGoalDescriptionEditor v-model="description" />
        </div>

        <!-- Target Date -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Target Date (Optional)
          </label>
          <UInput
            v-model="targetDate"
            type="date"
            placeholder="Select a target date"
          />
        </div>

        <!-- Milestones (only in edit mode) -->
        <div v-if="mode === 'edit' && goal?.id" class="pt-2">
          <GoalsMilestoneList
            :goal-id="goal.id"
            :milestones="milestones"
            @updated="handleMilestonesUpdated"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="isSubmitting"
        @click="isOpen = false"
      >
        Cancel
      </UButton>
      <UButton
        :loading="isSubmitting"
        :disabled="!isFormValid"
        @click="handleSubmit"
      >
        {{ mode === "create" ? "Create Goal" : "Save Changes" }}
      </UButton>
    </template>
  </UModal>
</template>
