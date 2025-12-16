<script setup lang="ts">
import type { User } from "~/types";

interface Props {
  modelValue: boolean;
  buddy: User | null;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [notes: string];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const notes = ref("");
const isSubmitting = ref(false);

// Clear notes when modal opens
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      notes.value = "";
    }
  },
);

const handleSubmit = async () => {
  if (!notes.value.trim()) return;

  isSubmitting.value = true;
  try {
    emit("submit", notes.value.trim());
    notes.value = "";
    isOpen.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

const canSubmit = computed(
  () => notes.value.trim().length > 0 && !isSubmitting.value,
);
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="buddy ? `Check-in with ${buddy.name}` : 'Check-in'"
  >
    <template #body>
      <div v-if="buddy" class="space-y-4">
        <div class="flex items-center gap-3 mb-4">
          <UAvatar :src="buddy.avatarUrl" :alt="buddy.name" size="sm" />
          <div>
            <p class="text-sm text-gray-500">{{ buddy.email }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Check-in Notes</label>
          <UTextarea
            v-model="notes"
            class="w-full"
            placeholder="Record how the check-in went. Mention any blockers, progress updates, or assistance needed..."
            :rows="6"
            :disabled="isSubmitting"
          />
          <div class="mt-2 flex items-center justify-between">
            <p class="text-xs text-gray-500">
              These notes will be auto-assigned to the next upcoming review.
            </p>
            <p class="text-xs text-gray-500">{{ notes.length }} characters</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          variant="ghost"
          :disabled="isSubmitting"
          @click="isOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          :loading="isSubmitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          Save Check-in
        </UButton>
      </div>
    </template>
  </UModal>
</template>
