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
  return format(new Date(date), "MMM d, yyyy");
};

const formatWeekYear = (weekYear: string | undefined) => {
  if (!weekYear) return "";
  const match = weekYear.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return weekYear;
  return `Week ${parseInt(match[2])}, ${match[1]}`;
};

const handleMarkAsRead = () => {
  if (props.feedback) {
    emit("markAsRead", props.feedback.id);
  }
};
</script>

<template>
  <UModal
    v-model:open="isOpen" class="sm:max-w-2xl" :ui="{
      footer: 'justify-end',
    }">
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
                v-if="feedback.reviewer"
                :src="feedback.reviewer.image || feedback.reviewer.avatarUrl"
                :alt="feedback.reviewer.name"
                size="xl"
                class="ring-2 ring-white/20"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  Feedback from
                </p>
                <p class="text-xl font-bold text-white truncate">
                  {{ feedback.reviewer?.name || "Unknown" }}
                </p>
                <p v-if="feedback.reviewer?.email" class="text-sm text-gray-400 mt-1 truncate">
                  {{ feedback.reviewer.email }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Meta Tags -->
        <div class="flex items-center gap-2 mb-5 flex-wrap">
          <span
            v-if="feedback.publishedAt || feedback.createdAt"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1"
          >
            <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
            {{ formatDate(feedback.publishedAt || feedback.createdAt) }}
          </span>
          <span
            v-if="(feedback as any).weekYear"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1"
          >
            <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
            {{ formatWeekYear((feedback as any).weekYear) }}
          </span>
          <span
            v-if="feedback.reviewee"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1"
          >
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
            To {{ feedback.reviewee.name }}
          </span>
        </div>

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
