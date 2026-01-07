<script setup lang="ts">
import { format } from "date-fns";
import type { FeedbackWithReviewer } from "~/types";

interface Props {
  modelValue: boolean;
  feedback: FeedbackWithReviewer | null;
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
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
};

const handleMarkAsRead = () => {
  if (props.feedback) {
    emit("markAsRead", props.feedback.id);
  }
};

const modalTitle = computed(() => {
  if (!props.feedback) return "Feedback Details";
  return `Feedback from ${props.feedback.reviewer?.name || "Unknown"}`;
});

const modalDescription = computed(() => {
  if (!props.feedback) return "";
  return formatDate(props.feedback.publishedAt || props.feedback.createdAt);
});
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="modalTitle"
    :description="modalDescription"
    class="sm:max-w-2xl"
    :ui="{
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div v-if="feedback" class="space-y-6">
        <!-- From/To Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- From -->
          <div v-if="feedback.reviewer" class="space-y-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              From
            </p>
            <div class="flex items-center gap-3">
              <UAvatar
                :src="feedback.reviewer.image || feedback.reviewer.avatarUrl"
                :alt="feedback.reviewer.name"
                size="md"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ feedback.reviewer.name }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ feedback.reviewer.email }}
                </p>
              </div>
            </div>
          </div>

          <!-- To -->
          <div v-if="feedback.reviewee" class="space-y-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              To
            </p>
            <div class="flex items-center gap-3">
              <UAvatar
                :src="feedback.reviewee.image || feedback.reviewee.avatarUrl"
                :alt="feedback.reviewee.name"
                size="md"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ feedback.reviewee.name }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ feedback.reviewee.email }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 dark:border-gray-700" />

        <!-- Feedback Content -->
        <div class="space-y-2">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Feedback
          </p>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
              {{ feedback.content }}
            </p>
          </div>
        </div>

        <!-- Status Badges -->
        <div class="flex items-center gap-3">
          <UBadge
            v-if="feedback.isRead !== undefined"
            :label="feedback.isRead ? 'Read' : 'Unread'"
            :color="feedback.isRead ? 'neutral' : 'primary'"
            size="sm"
          />
          <UBadge
            v-if="feedback.published !== undefined"
            :label="feedback.published ? 'Published' : 'Pending'"
            :color="feedback.published ? 'success' : 'neutral'"
            size="sm"
          />
        </div>

        <!-- Linked Review -->
        <div v-if="feedback.review" class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <div class="flex items-start gap-3">
            <UIcon 
              name="i-heroicons-calendar-days" 
              class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" 
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-700 dark:text-gray-300">
                Your buddy has linked this feedback to your 
                <NuxtLink 
                  :to="`/reviews/${feedback.review.id}`"
                  class="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  @click="isOpen = false"
                >
                  {{ feedback.review.name || 'review' }}
                </NuxtLink>
                review.
              </p>
            </div>
          </div>
        </div>

        <!-- No Review Assigned -->
        <div v-else class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-start gap-3">
            <UIcon 
              name="i-heroicons-calendar" 
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" 
            />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Your buddy has not assigned this feedback to any review yet.
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        @click="isOpen = false"
      >
        Close
      </UButton>
      <UButton
        v-if="showMarkAsRead && feedback && feedback.isRead === false"
        color="primary"
        @click="handleMarkAsRead"
      >
        Mark as Read
      </UButton>
    </template>
  </UModal>
</template>
