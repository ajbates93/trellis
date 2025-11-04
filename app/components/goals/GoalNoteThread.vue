<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

const props = defineProps<{
  goalId: string;
  canAddNote?: boolean;
}>();

const emit = defineEmits<{
  noteAdded: [];
}>();

const toast = useToast();

// Fetch notes
const { data: notesData, refresh: refreshNotes } = await useFetch(
  `/api/goals/${props.goalId}/notes`,
);
const notes = computed(() => notesData.value?.notes || []);

// Add note state
const noteText = ref("");
const isSubmitting = ref(false);
const showNoteForm = ref(false);

// Validation
const isFormValid = computed(() => {
  return noteText.value.trim().length > 0 && noteText.value.length <= 2000;
});

const charCount = computed(() => noteText.value.length);

// Submit note
const submitNote = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    await $fetch(`/api/goals/${props.goalId}/notes`, {
      method: "POST",
      body: {
        noteText: noteText.value.trim(),
      },
    });

    // Reset form
    noteText.value = "";
    showNoteForm.value = false;

    // Refresh notes
    await refreshNotes();
    emit("noteAdded");

    toast.add({
      title: "Note added",
      description: "Your note has been added successfully.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to add note:", error);
    toast.add({
      title: "Failed to add note",
      description: "Please try again.",
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Format relative time
const formatRelativeTime = (dateString: string) => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};
</script>

<template>
  <div class="space-y-4">
    <!-- Notes List -->
    <div v-if="notes.length > 0" class="space-y-3">
      <div
        v-for="note in notes"
        :key="note.id"
        class="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
      >
        <!-- Avatar -->
        <UAvatar
          :src="note.author.avatarUrl || note.author.image"
          :alt="note.author.name"
          size="sm"
        />

        <!-- Note Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm">{{ note.author.name }}</span>
            <span class="text-xs text-gray-500">
              {{ formatRelativeTime(note.createdAt) }}
            </span>
          </div>
          <p
            class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
          >
            {{ note.noteText }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-4 text-gray-500 text-sm">
      No notes yet
    </div>

    <!-- Add Note Button/Form -->
    <div v-if="canAddNote !== false">
      <div v-if="!showNoteForm">
        <UButton
          icon="i-heroicons-chat-bubble-left-ellipsis"
          variant="outline"
          size="sm"
          @click="showNoteForm = true"
        >
          Add Note
        </UButton>
      </div>

      <div v-else class="space-y-2">
        <UTextarea
          v-model="noteText"
          placeholder="Add a note or comment..."
          :rows="3"
          :maxlength="2000"
          autofocus
        />
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-500">
            {{ charCount }}/2000 characters
          </span>
          <div class="flex gap-2">
            <UButton
              color="gray"
              variant="ghost"
              size="sm"
              @click="
                showNoteForm = false;
                noteText = '';
              "
              :disabled="isSubmitting"
            >
              Cancel
            </UButton>
            <UButton
              size="sm"
              :loading="isSubmitting"
              :disabled="!isFormValid"
              @click="submitNote"
            >
              Add Note
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
