<script setup lang="ts">
import type { FeedbackWithReviewer } from '~/types'

defineProps<{
  favourites: FeedbackWithReviewer[]
}>()

const emit = defineEmits<{
  open: [feedback: FeedbackWithReviewer]
  'unfavourite': [feedbackId: string]
}>()

const formatRelativeTime = (date: Date | string | null | undefined) => {
  if (!date) return ''
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
</script>

<template>
  <div v-if="favourites.length > 0" class="mb-6">
    <h2 class="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">
      <UIcon name="i-heroicons-star-solid" class="w-4 h-4 text-amber-500" />
      Favourites
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="item in favourites"
        :key="item.id"
        class="cursor-pointer group text-left flex flex-col items-stretch bg-white dark:bg-gray-800/50 ring-1 ring-gray-200 dark:ring-(--ui-border) rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
        @click="emit('open', item)"
      >
        <div class="flex items-start gap-4 flex-1">
          <UAvatar
            :src="item.reviewer.image || item.reviewer.avatarUrl || undefined"
            :alt="item.reviewer.name"
            size="lg"
            class="flex-shrink-0"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2 mb-1">
              <span class="font-semibold text-gray-900 dark:text-white truncate block">
                {{ item.reviewer.name }}
              </span>
              <FeedbackFavouriteToggle
                :feedback-id="item.id"
                :is-favourite="item.isFavourite"
                size="xs"
                @update:is-favourite="(v) => !v && emit('unfavourite', item.id)"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {{ formatRelativeTime(item.publishedAt ?? item.createdAt) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {{ item.content }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
