<script setup lang="ts">
import { defineProps, defineEmits, ref } from "vue";

const props = defineProps<{
  open?: boolean;
  buddy: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [
    checkin: {
      id: string;
      buddy: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
      };
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
      };
      notes: string;
      reviewSchedule: {
        id: string;
        scheduledDate: string;
        name: string;
        status: string;
      } | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ];
}>();

const toast = useToast();

// State
const notes = ref("");
const isSubmitting = ref(false);

// Clear notes when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      notes.value = "";
    }
  },
);

// Actions
const handleSubmit = async () => {
  if (!notes.value.trim()) {
    toast.add({
      title: "Notes required",
      description: "Please add check-in notes before submitting.",
      color: "warning",
      icon: "i-heroicons-exclamation-triangle",
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const createdCheckin = await $fetch("/api/checkins", {
      method: "POST",
      body: {
        userId: props.buddy.id,
        notes: notes.value.trim(),
      },
    });

    toast.add({
      title: "Check-in created",
      description: `Check-in with ${props.buddy.name} recorded successfully.`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    notes.value = "";
    emit("created", createdCheckin);
    emit("update:open", false);
  } catch (error) {
    console.error("Failed to create check-in:", error);
    toast.add({
      title: "Failed to create check-in",
      description: "An error occurred while creating the check-in.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <UModal
    :open="open"
    :title="`Check-in with ${buddy.name}`"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
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
            placeholder="Record how the check-in went. Mention any blockers, progress updates, or assistance needed..."
            rows="6"
            :disabled="isSubmitting"
          />
          <p class="text-xs text-gray-500 mt-1">
            These notes will be auto-assigned to the next upcoming review.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          variant="ghost"
          :disabled="isSubmitting"
          @click="emit('update:open', false)"
        >
          Cancel
        </UButton>
        <UButton
          :loading="isSubmitting"
          :disabled="!notes.trim() || isSubmitting"
          @click="handleSubmit"
        >
          Save Check-in
        </UButton>
      </div>
    </template>
  </UModal>
</template>
