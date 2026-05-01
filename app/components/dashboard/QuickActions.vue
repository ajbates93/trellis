<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <NuxtLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors duration-150"
      :class="action.bgClass"
    >
      <UIcon :name="action.icon" class="text-lg" :class="action.iconClass" />
      <span class="text-sm font-medium" :class="action.textClass">{{ action.label }}</span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const actions = [
  {
    label: 'Submit feedback',
    icon: 'i-heroicons-paper-airplane',
    to: '/feedback/give',
    iconClass: 'text-teal-700 dark:text-teal-300',
    textClass: 'text-teal-700 dark:text-teal-300',
    bgClass: 'bg-teal-100 border-teal-300 hover:bg-teal-200 hover:border-teal-400 dark:bg-teal-900/30 dark:border-teal-500/40 dark:hover:bg-teal-900/50 dark:hover:border-teal-500/60',
  },
  {
    label: 'Add to brag bucket',
    icon: 'i-heroicons-star',
    to: '/brag-bucket',
    iconClass: 'text-amber-700 dark:text-amber-300',
    textClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-100 border-amber-300 hover:bg-amber-200 hover:border-amber-400 dark:bg-amber-900/30 dark:border-amber-500/40 dark:hover:bg-amber-900/50 dark:hover:border-amber-500/60',
  },
  {
    label: 'Update goals',
    icon: 'i-heroicons-flag',
    to: '/goals',
    iconClass: 'text-purple-700 dark:text-purple-300',
    textClass: 'text-purple-700 dark:text-purple-300',
    bgClass: 'bg-purple-100 border-purple-300 hover:bg-purple-200 hover:border-purple-400 dark:bg-purple-900/30 dark:border-purple-500/40 dark:hover:bg-purple-900/50 dark:hover:border-purple-500/60',
  },
]
</script>
