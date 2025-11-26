<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  achievement?: {
    id: string;
    title: string;
    description?: string | null;
    achievedDate: string;
  } | null;
  mode: "create" | "edit";
}>();

const emit = defineEmits<{
  close: [];
  success: [achievement: any];
  "update:isOpen": [value: boolean];
}>();

const toast = useToast();

// Local computed for v-model
const isOpen = computed({
  get: () => props.isOpen,
  set: (value: boolean) => emit("update:isOpen", value),
});

// Form state
const title = ref("");
const description = ref("");
const achievedDate = ref(new Date().toISOString().split("T")[0]);
const isSubmitting = ref(false);

// Reset form to current achievement or defaults
const resetForm = () => {
  if (props.mode === "edit" && props.achievement) {
    title.value = props.achievement.title;
    description.value = props.achievement.description || "";
    achievedDate.value = props.achievement.achievedDate;
  } else {
    title.value = "";
    description.value = "";
    achievedDate.value = new Date().toISOString().split("T")[0];
  }
};

// Update form when achievement prop changes
watch(
  () => props.achievement,
  () => {
    if (props.isOpen) {
      resetForm();
    }
  },
  { immediate: true }
);

// Reset form when modal opens
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      resetForm();
    }
  }
);

// Validation
const isFormValid = computed(() => {
  return (
    title.value.trim().length >= 5 &&
    title.value.length <= 255 &&
    achievedDate.value
  );
});

// Submit handler
const handleSubmit = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    if (props.mode === "create") {
      const { achievement } = await $fetch("/api/achievements", {
        method: "POST",
        body: {
          title: title.value.trim(),
          description: description.value || null,
          achievedDate: achievedDate.value,
        },
      });
      emit("success", achievement);
      toast.add({
        title: "Achievement added",
        description: `"${title.value}" has been added to your bucket.`,
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    } else if (props.mode === "edit" && props.achievement) {
      const { achievement } = await $fetch(
        `/api/achievements/${props.achievement.id}`,
        {
          method: "PATCH",
          body: {
            title: title.value.trim(),
            description: description.value || null,
            achievedDate: achievedDate.value,
          },
        },
      );
      emit("success", achievement);
      toast.add({
        title: "Achievement updated",
        description: "Your changes have been saved successfully.",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    }

    isOpen.value = false;
  } catch (error) {
    console.error("Error submitting achievement:", error);
    toast.add({
      title: "Error",
      description: "Failed to save achievement. Please try again.",
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
    v-model:open="isOpen"
    :title="mode === 'create' ? 'Add Achievement' : 'Edit Achievement'"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Title" :required="true">
          <UInput
            v-model="title"
            placeholder="What did you accomplish?"
            class="w-full"
            :maxlength="255"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ title.length }}/255 characters
          </p>
        </UFormField>

        <UFormField label="Date" :required="true">
          <UInput
            v-model="achievedDate"
            class="w-full"
            type="date"
            :max="new Date().toISOString().split('T')[0]"
          />
        </UFormField>

        <UFormField label="Details (optional)">
          <UTextarea
            v-model="description"
            placeholder="Tell the story of your achievement..."
            :rows="6"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          Cancel
        </UButton>
        <UButton
          :disabled="!isFormValid"
          :loading="isSubmitting"
          @click="handleSubmit"
        >
          {{ mode === "create" ? "Add Achievement" : "Save Changes" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
