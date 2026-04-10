<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <NuxtLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-800 hover:bg-gray-900/50 transition-all duration-150"
      :class="action.hoverBorder"
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
    iconClass: 'text-teal-400',
    textClass: 'text-teal-400',
    hoverBorder: 'hover:border-teal-500/30',
  },
  {
    label: 'Add to brag bucket',
    icon: 'i-heroicons-star',
    to: '/brag-bucket',
    iconClass: 'text-amber-400',
    textClass: 'text-amber-400',
    hoverBorder: 'hover:border-amber-500/30',
  },
  {
    label: 'Update goals',
    icon: 'i-heroicons-flag',
    to: '/goals',
    iconClass: 'text-purple-400',
    textClass: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/30',
  },
]
</script>
