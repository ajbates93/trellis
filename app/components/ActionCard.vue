<template>
  <NuxtLink
    :to="to"
    class="block group"
  >
    <UCard
      class="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      :class="cardClasses"
    >
      <div class="flex flex-col items-center text-center space-y-3 py-2">
        <!-- Badge -->
        <div v-if="badge" class="absolute top-3 right-3">
          <UBadge
            :label="badge"
            color="primary"
            size="sm"
          />
        </div>

        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          :class="iconContainerClasses"
        >
          <UIcon
            :name="icon"
            class="w-6 h-6"
            :class="iconClasses"
          />
        </div>

        <!-- Title -->
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          {{ title }}
        </h3>

        <!-- Description -->
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {{ description }}
        </p>
      </div>
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description: string
  icon: string
  to: string
  badge?: string | number
  color?: 'primary' | 'success' | 'warning' | 'info' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})

const colorMap = {
  primary: {
    card: 'bg-gradient-to-br from-teal-50/50 to-green-50/50 dark:from-teal-900/10 dark:to-green-900/10',
    iconContainer: 'bg-teal-100 dark:bg-teal-900/30',
    icon: 'text-teal-600 dark:text-teal-400',
  },
  success: {
    card: 'bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10',
    iconContainer: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    card: 'bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10',
    iconContainer: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    card: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10',
    iconContainer: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    card: 'bg-gradient-to-br from-gray-50/50 to-slate-50/50 dark:from-gray-900/10 dark:to-slate-900/10',
    iconContainer: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
  },
}

const cardClasses = computed(() => colorMap[props.color].card)
const iconContainerClasses = computed(() => colorMap[props.color].iconContainer)
const iconClasses = computed(() => colorMap[props.color].icon)
</script>
