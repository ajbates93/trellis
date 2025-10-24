<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  goal?: {
    id: string;
    goalText: string;
    targetDate: string | null;
  } | null;
  mode: "create" | "edit";
}>();

const emit = defineEmits<{
  close: [];
  success: [goal: any];
  "update:isOpen": [value: boolean];
}>();

// Local computed for v-model
const isOpen = computed({
  get: () => props.isOpen,
  set: (value: boolean) => emit("update:isOpen", value),
});

// Form state
const goalText = ref(props.goal?.goalText || "");
const targetDate = ref(props.goal?.targetDate || null);
const isSubmitting = ref(false);

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
          targetDate: targetDate.value || null,
        },
      });
      emit("success", goal);
    } else if (props.mode === "edit" && props.goal) {
      const { goal } = await $fetch(`/api/goals/${props.goal.id}`, {
        method: "PATCH",
        body: {
          goalText: goalText.value.trim(),
          targetDate: targetDate.value || null,
        },
      });
      emit("success", goal);
    }

    isOpen.value = false;
  } catch (error) {
    console.error("Failed to save goal:", error);
    alert("Failed to save goal. Please try again.");
  } finally {
    isSubmitting.value = false;
  }
};

// Reset form when modal closes
watch(isOpen, (newVal) => {
  if (!newVal) {
    goalText.value = props.goal?.goalText || "";
    targetDate.value = props.goal?.targetDate || null;
  }
});
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="mode === 'create' ? 'Create New Goal' : 'Edit Goal'"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Goal Text -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Goal <span class="text-red-500">*</span>
          </label>
          <UTextarea
            v-model="goalText"
            placeholder="Describe your goal..."
            :rows="4"
            :maxlength="500"
            autofocus
          />
          <div class="flex justify-between mt-1 text-xs text-gray-500">
            <span v-if="goalText.length < 10" class="text-red-500">
              Minimum 10 characters
            </span>
            <span v-else class="text-green-500">
              ✓ Valid
            </span>
            <span :class="{ 'text-red-500': charCount > 500 }">
              {{ charCount }}/500
            </span>
          </div>
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
      </div>
    </template>

    <template #footer>
      <UButton
        color="gray"
        variant="ghost"
        @click="isOpen = false"
        :disabled="isSubmitting"
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
