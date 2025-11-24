<script setup lang="ts">
import { format } from 'date-fns'

const props = defineProps<{
  achievement: {
    id: string
    userId: string
    title: string
    description?: string | null
    achievedDate: string
    createdAt?: string | Date | null
    updatedAt?: string | Date | null
  }
}>()

const emit = defineEmits<{
  updated: []
  deleted: []
  edit: [achievement: any]
}>()

const toast = useToast()

const isDeleting = ref(false)

const deleteAchievement = async () => {
  if (!confirm('Are you sure you want to delete this achievement?')) return

  isDeleting.value = true
  try {
    await $fetch(`/api/achievements/${props.achievement.id}`, {
      method: 'DELETE',
    })

    emit('deleted')

    toast.add({
      title: 'Achievement deleted',
      description: 'The achievement has been removed from your bucket.',
      color: 'success',
      icon: 'i-heroicons-check-circle-20-solid',
    })
  } catch (error) {
    console.error('Failed to delete achievement:', error)
    toast.add({
      title: 'Failed to delete achievement',
      color: 'error',
      icon: 'i-heroicons-x-circle-20-solid',
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="group">
    <!-- Achievement Card -->
    <UCard
      class="border-l-4 border-l-teal-500 hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800"
    >
      <template #body>
        <div class="space-y-3">
          <!-- Title and Date -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white break-words">
                {{ achievement.title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ format(new Date(achievement.achievedDate), 'MMMM d, yyyy') }}
              </p>
            </div>
            <div class="flex-shrink-0 text-2xl">✨</div>
          </div>

          <!-- Description preview -->
          <p
            v-if="achievement.description"
            class="text-gray-700 dark:text-gray-300 text-sm line-clamp-2 whitespace-pre-wrap"
          >
            {{ achievement.description }}
          </p>

          <!-- Actions -->
          <div
            class="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-pencil-square-20-solid"
              @click="emit('edit', achievement)"
            >
              Edit
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-heroicons-trash-20-solid"
              :loading="isDeleting"
              @click="deleteAchievement"
            >
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
