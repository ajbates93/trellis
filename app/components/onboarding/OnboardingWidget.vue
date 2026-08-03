<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
    :class="{ 'w-80': !isStatic, 'w-full': isStatic }"
  >
    <!-- Header -->
    <button
      class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      :class="{ 'cursor-default': isStatic }"
      @click="toggleCollapse"
    >
      <h3 class="font-semibold text-gray-900 dark:text-white">
        Getting Started
      </h3>
      <UIcon
        v-if="!isStatic"
        name="i-lucide-chevron-down"
        class="w-5 h-5 text-gray-500 transition-transform duration-200"
        :class="{ 'rotate-180': isCollapsed }"
      />
    </button>

    <!-- Task List (collapsible) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-show="!isCollapsed" class="overflow-hidden">
        <div class="px-2 pb-2 space-y-1">
          <NuxtLink
            v-for="task in tasks"
            :key="task.id"
            :to="getTaskLink(task.id)"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
            :class="[
              task.completed
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            ]"
          >
            <!-- Checkmark / Empty circle -->
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
              :class="[
                task.completed
                  ? 'bg-primary text-inverted'
                  : 'border-2 border-dashed border-gray-300 dark:border-gray-600'
              ]"
            >
              <UIcon
                v-if="task.completed"
                name="i-lucide-check"
                class="w-4 h-4"
              />
            </div>

            <!-- Task info -->
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium truncate"
                :class="[
                  task.completed
                    ? 'text-primary'
                    : 'text-gray-900 dark:text-white'
                ]"
              >
                {{ task.label }}
              </p>
              <p
                v-if="!task.completed"
                class="text-xs text-gray-500 dark:text-gray-400 truncate"
              >
                {{ task.description }}
              </p>
            </div>

            <!-- Arrow for incomplete tasks -->
            <UIcon
              v-if="!task.completed"
              name="i-lucide-chevron-right"
              class="w-4 h-4 text-gray-400 flex-shrink-0"
            />
          </NuxtLink>
        </div>

        <!-- Progress footer -->
        <div class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Getting Started: {{ progressPercent }}%
          </span>
          <!-- Circular progress -->
          <div class="relative w-8 h-8">
            <svg class="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <!-- Background circle -->
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke-width="3"
                fill="none"
                class="stroke-gray-200 dark:stroke-gray-700"
              />
              <!-- Progress circle -->
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke-width="3"
                fill="none"
                class="stroke-teal-500 transition-all duration-500"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isStatic?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStatic: false,
});

const { tasks, progressPercent } = useOnboarding();

// Collapse state (only for floating mode)
const isCollapsed = ref(false);

const toggleCollapse = () => {
  if (!props.isStatic) {
    isCollapsed.value = !isCollapsed.value;
  }
};

// Progress circle math
const circumference = 2 * Math.PI * 12; // radius = 12
const strokeDashoffset = computed(() => {
  return circumference - (progressPercent.value / 100) * circumference;
});

// Get link for each task
const getTaskLink = (taskId: string): string => {
  const links: Record<string, string> = {
    "submit-feedback": "/feedback/give",
    "view-inbox": "/feedback/inbox",
    "create-goal": "/goals",
    "add-achievement": "/brag-bucket",
  };
  return links[taskId] || "/";
};
</script>
