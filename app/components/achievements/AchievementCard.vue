<script setup lang="ts">
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
  align?: 'left' | 'right'
}>()

const emit = defineEmits<{
  updated: []
  deleted: []
  edit: [achievement: {
    id: string
    userId: string
    title: string
    description?: string | null
    achievedDate: string
    createdAt?: string | Date | null
    updatedAt?: string | Date | null
  }]
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
      class="hover:shadow-lg transition-shadow duration-200 bg-gray-50 dark:bg-gray-800/50"
    >
      <div class="space-y-2">
        <!-- Title -->
        <h3
          class="text-lg font-semibold text-gray-900 dark:text-white break-words"
          :class="align === 'right' ? 'text-right' : 'text-left'"
        >
          {{ achievement.title }}
        </h3>

        <!-- Description -->
        <p
          v-if="achievement.description"
          class="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap"
          :class="align === 'right' ? 'text-right' : 'text-left'"
        >
          {{ achievement.description }}
        </p>

        <!-- Actions -->
        <div
          class="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          :class="align === 'right' ? 'justify-end' : 'justify-start'"
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
    </UCard>
  </div>
</template>
