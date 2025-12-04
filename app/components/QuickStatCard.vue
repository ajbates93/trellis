<template>
  <UCard
    class="bg-gradient-to-br"
    :class="cardClasses"
  >
    <div class="flex items-center gap-4">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        :class="iconContainerClasses"
      >
        <UIcon
          :name="icon"
          class="w-5 h-5"
          :class="iconClasses"
        />
      </div>
      <div class="min-w-0">
        <p class="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ displayValue }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
          {{ label }}
        </p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: string | number | null
  icon: string
  color?: 'teal' | 'blue' | 'purple' | 'amber'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'teal',
})

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '—'
  }
  return props.value
})

const colorMap = {
  teal: {
    card: 'from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20',
    iconContainer: 'bg-teal-100 dark:bg-teal-900/40',
    icon: 'text-teal-600 dark:text-teal-400',
  },
  blue: {
    card: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    iconContainer: 'bg-blue-100 dark:bg-blue-900/40',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    card: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
    iconContainer: 'bg-purple-100 dark:bg-purple-900/40',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  amber: {
    card: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    iconContainer: 'bg-amber-100 dark:bg-amber-900/40',
    icon: 'text-amber-600 dark:text-amber-400',
  },
}

const cardClasses = computed(() => colorMap[props.color].card)
const iconContainerClasses = computed(() => colorMap[props.color].iconContainer)
const iconClasses = computed(() => colorMap[props.color].icon)
</script>
