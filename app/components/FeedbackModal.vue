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
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
};

// Resolve the primary person to display based on available data
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
        <!-- Header Banner -->
        <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white p-6 mb-6 -mt-1">
          <!-- Background Decoration -->
          <div class="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl" />
          <div class="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <div class="relative z-10">
            <div class="flex items-center gap-4">
              <UAvatar
                v-if="displayPerson"
                :src="displayPerson.image || displayPerson.avatarUrl"
                :alt="displayPerson.name"
                size="xl"
                class="ring-2 ring-white/20"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  {{ displayPerson?.label || "Feedback" }}
                </p>
                <p class="text-xl font-bold text-white truncate">
                  {{ displayPerson?.name || "Unknown" }}
                </p>
                <p v-if="displayPerson?.email" class="text-sm text-gray-400 mt-1 truncate">
                  {{ displayPerson.email }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Date -->
        <p
          v-if="feedback.publishedAt || feedback.createdAt"
          class="text-xs text-gray-500 dark:text-gray-400 mb-5"
        >
          {{ formatDate(feedback.publishedAt || feedback.createdAt) }}
        </p>

        <!-- Feedback Content -->
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
