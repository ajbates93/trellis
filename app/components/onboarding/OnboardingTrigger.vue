<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Floating Widget Panel -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-16 right-0 mb-2"
      >
        <OnboardingWidget />
      </div>
    </Transition>

    <!-- Floating Trigger Button -->
    <button
      class="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
      :class="buttonClasses"
      @click="toggle"
    >
      <!-- Default icon or animated check -->
      <Transition
        mode="out-in"
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-50"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-50"
      >
        <UIcon
          v-if="isAnimating"
          key="check"
          name="i-lucide-check"
          class="w-6 h-6 text-white"
        />
        <UIcon
          v-else
          key="list"
          name="i-lucide-list-checks"
          class="w-6 h-6"
          :class="isOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300'"
        />
      </Transition>

      <!-- Progress badge -->
      <span
        v-if="!isAnimating && completedCount < totalCount"
        class="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center bg-teal-500 text-white"
      >
        {{ totalCount - completedCount }}
      </span>

      <!-- Pulse animation ring when animating -->
      <span
        v-if="isAnimating"
        class="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-75"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const { isOpen, isAnimating, toggle, completedCount, totalCount } = useOnboarding();

const buttonClasses = computed(() => {
  if (isAnimating) {
    return 'bg-green-500 scale-110';
  }
  if (isOpen) {
    return 'bg-teal-500';
  }
  return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700';
});
</script>
