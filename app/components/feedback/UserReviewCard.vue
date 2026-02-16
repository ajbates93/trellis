<script setup lang="ts">
defineProps<{
  user: {
    id: string
    name: string
    email: string
    image?: string | null
    avatarUrl?: string | null
    roleType?: string | null
  }
  isReviewedThisWeek: boolean
  lastReviewedText: string
  isSelected: boolean
}>()

defineEmits<{
  select: []
}>()

const getRoleLabel = (roleType: string | null | undefined) => {
  if (!roleType) return null
  const labels: Record<string, string> = {
    dev: 'Developer',
    design: 'Designer',
    qa: 'QA',
    growth: 'Growth',
    management: 'Management',
  }
  return labels[roleType] || roleType
}
</script>

<template>
  <button
    class="relative text-left w-full p-4 rounded-xl border transition-all duration-200 group"
    :class="[
      isSelected
        ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20'
        : isReviewedThisWeek
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 opacity-60'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:ring-2 hover:ring-primary-500/50 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md',
    ]"
    @click="$emit('select')"
  >
    <!-- Reviewed badge -->
    <div
      v-if="isReviewedThisWeek"
      class="absolute top-2 right-2"
    >
      <div class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <UIcon name="i-heroicons-check" class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <UAvatar
        :src="user.image || user.avatarUrl || undefined"
        :alt="user.name"
        size="lg"
      />
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-gray-900 dark:text-white truncate">
          {{ user.name }}
        </p>
        <UBadge
          v-if="user.roleType"
          :label="getRoleLabel(user.roleType) || ''"
          size="xs"
          color="neutral"
          variant="subtle"
          class="mt-1"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          {{ lastReviewedText }}
        </p>
      </div>
    </div>
  </button>
</template>
