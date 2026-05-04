<script setup lang="ts">
import { format } from "date-fns";
import type { FeedbackWithReviewer, FeedbackWithReviewee } from "~/types";

interface Props {
  modelValue: boolean;
  feedback: (FeedbackWithReviewer | FeedbackWithReviewee) | null;
  showMarkAsRead?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showMarkAsRead: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  markAsRead: [feedbackId: string];
  "update:isFavourite": [feedbackId: string, value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const formatDate = (date: string | Date | undefined | null) => {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
};

const displayPerson = computed(() => {
  if (!props.feedback) return null;
  if ("reviewer" in props.feedback && props.feedback.reviewer) {
    return { label: "Feedback from", ...props.feedback.reviewer };
  }
  if ("reviewee" in props.feedback && props.feedback.reviewee) {
    return { label: "Feedback to", ...props.feedback.reviewee };
  }
  return null;
});

// Favouriting only applies to feedback the current user received
// (i.e. when displayPerson is the reviewer, not the reviewee).
const canFavourite = computed(() => {
  if (!props.feedback) return false;
  return "reviewer" in props.feedback && props.feedback.reviewer != null;
});

const handleMarkAsRead = () => {
  if (props.feedback) {
    emit("markAsRead", props.feedback.id);
  }
};
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="displayPerson ? `${displayPerson.label} ${displayPerson.name}` : 'Feedback'"
    :description="feedback?.content?.slice(0, 100) || 'View feedback details'"
    class="sm:max-w-2xl"
    :ui="{
      footer: 'justify-end',
      title: 'sr-only',
      description: 'sr-only',
    }"
  >
    <template #body>
      <div v-if="feedback">
        <!-- Header -->
        <div class="flex items-start gap-4 mb-5">
          <UAvatar
            v-if="displayPerson"
            :src="displayPerson.image || displayPerson.avatarUrl"
            :alt="displayPerson.name"
            size="lg"
            class="flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {{ displayPerson?.label || "Feedback" }}
            </p>
            <p class="text-xl font-bold text-gray-900 dark:text-white truncate">
              {{ displayPerson?.name || "Unknown" }}
            </p>
            <p v-if="displayPerson?.email" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {{ displayPerson.email }}
            </p>
          </div>
          <FeedbackFavouriteToggle
            v-if="canFavourite"
            :feedback-id="feedback.id"
            :is-favourite="(feedback as FeedbackWithReviewer).isFavourite ?? false"
            size="sm"
            @update:is-favourite="(v) => emit('update:isFavourite', feedback!.id, v)"
          />
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 dark:border-gray-700 mb-4" />

        <!-- Dates -->
        <div
          v-if="feedback.publishedAt || feedback.createdAt"
          class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-5"
        >
          <span v-if="feedback.createdAt">
            Submitted {{ formatDate(feedback.createdAt) }}
          </span>
          <span v-if="feedback.publishedAt">
            Published {{ formatDate(feedback.publishedAt) }}
          </span>
        </div>

        <!-- Feedback content -->
        <div class="border-l-4 border-primary-500 pl-5 py-1">
          <p class="text-base text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
            {{ feedback.content }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="outline" @click="isOpen = false">
        Close
      </UButton>
      <UButton v-if="showMarkAsRead && feedback && feedback.isRead === false" color="primary" @click="handleMarkAsRead">
        Mark as Read
      </UButton>
    </template>
  </UModal>
</template>
