<script setup lang="ts">
const props = defineProps<{
  feedbackId: string
  isFavourite: boolean
  size?: 'xs' | 'sm' | 'md'
}>()

const emit = defineEmits<{
  'update:isFavourite': [value: boolean]
}>()

const toast = useToast()
const isPending = ref(false)

const toggle = async (e: MouseEvent) => {
  e.stopPropagation()
  if (isPending.value) return

  const next = !props.isFavourite
  // Optimistic update
  emit('update:isFavourite', next)
  isPending.value = true

  try {
    await $api(`/feedback/${props.feedbackId}/favourite`, {
      method: 'PATCH',
      body: { isFavourite: next },
    })
  } catch (error) {
    // Rollback
    emit('update:isFavourite', !next)
    console.error('Failed to toggle favourite:', error)
    toast.add({
      title: 'Failed to update favourite',
      color: 'error',
      icon: 'i-heroicons-x-circle-20-solid',
    })
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <UButton
    :icon="isFavourite ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
    :color="isFavourite ? 'warning' : 'neutral'"
    variant="ghost"
    :size="size ?? 'sm'"
    :aria-label="isFavourite ? 'Remove from favourites' : 'Add to favourites'"
    :aria-pressed="isFavourite"
    :loading="isPending"
    @click="toggle"
  />
</template>
