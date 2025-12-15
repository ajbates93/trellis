<template>
  <UDashboardPanel id="goals">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header with Add button -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Goals
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Track and manage your personal development goals
            </p>
          </div>
          <UButton icon="i-heroicons-plus" @click="showCreateModal = true">
            Add Goal
          </UButton>
        </div>

        <!-- Tabbed Goals Interface -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          variant="pill"
          color="neutral"
          size="lg"
          class="w-full"
          :ui="{
            list: 'bg-gray-100 dark:bg-gray-800 rounded-xl p-1',
            trigger: 'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
            indicator: 'bg-white dark:bg-gray-900 shadow-sm',
          }"
        >
          <!-- Active Goals Tab -->
          <template #active>
            <div class="pt-6">
              <!-- Empty state -->
              <div v-if="activeGoals.length === 0">
                <div class="text-center py-16 px-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-heroicons-rocket-launch" class="w-8 h-8 text-primary" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Set your first goal
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Goals help you track your professional development. Start with something you want to achieve this quarter.
                  </p>
                  <UButton icon="i-heroicons-plus" size="lg" @click="showCreateModal = true">
                    Create Your First Goal
                  </UButton>
                </div>
              </div>

              <!-- Goals grid -->
              <div
                v-else
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <GoalsGoalCard
                  v-for="goal in activeGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="owner"
                  @status-changed="handleGoalChange"
                  @deleted="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </div>
          </template>

          <!-- Completed Goals Tab -->
          <template #completed>
            <div class="pt-6">
              <!-- Empty state -->
              <div v-if="completedGoals.length === 0">
                <div class="text-center py-16 px-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No completed goals yet
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Keep working on your active goals. When you complete them, they'll appear here as achievements!
                  </p>
                </div>
              </div>

              <!-- Goals grid -->
              <div
                v-else
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <GoalsGoalCard
                  v-for="goal in completedGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="owner"
                  @status-changed="handleGoalChange"
                  @deleted="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </div>
          </template>

          <!-- Archived Goals Tab -->
          <template #archived>
            <div class="pt-6">
              <!-- Empty state -->
              <div v-if="archivedGoals.length === 0">
                <div class="text-center py-12 px-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UIcon name="i-heroicons-archive-box" class="w-6 h-6 text-gray-400" />
                  </div>
                  <p class="text-gray-500 dark:text-gray-400">
                    No archived goals
                  </p>
                </div>
              </div>

              <!-- Goals grid -->
              <div
                v-else
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                <GoalsGoalCard
                  v-for="goal in archivedGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="owner"
                  @status-changed="handleGoalChange"
                  @deleted="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Goal Modal -->
  <GoalsGoalModal
    :is-open="showCreateModal"
    mode="create"
    :goal="
      initialGoalText
        ? {
            goalText: initialGoalText,
            description: null,
            targetDate: null,
            id: '',
          }
        : null
    "
    @update:is-open="showCreateModal = $event"
    @success="handleGoalCreated"
  />
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

// Type definitions
interface Goal {
  id: string;
  goalText: string;
  description: string | null;
  status: string | null;
  targetDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

definePageMeta({
  layout: "default",
});

// Fetch user's own goals
const { data: goalsData, refresh: refreshGoals } = await useFetch("/api/goals");
const myGoals = computed(() => (goalsData.value?.goals || []) as Goal[]);

// Group goals by status
const activeGoals = computed(() =>
  myGoals.value.filter((g: Goal) => g.status === "active"),
);
const completedGoals = computed(() =>
  myGoals.value.filter((g: Goal) => g.status === "completed"),
);
const archivedGoals = computed(() =>
  myGoals.value.filter((g: Goal) => g.status === "archived"),
);

// Tab state
const activeTab = ref('active');

// Tab items with icons and badges
const tabItems = computed<TabsItem[]>(() => [
  {
    label: 'Active',
    icon: 'i-heroicons-fire',
    badge: activeGoals.value.length > 0 ? activeGoals.value.length : undefined,
    value: 'active',
    slot: 'active',
  },
  {
    label: 'Completed',
    icon: 'i-heroicons-check-badge',
    badge: completedGoals.value.length > 0 ? completedGoals.value.length : undefined,
    value: 'completed',
    slot: 'completed',
  },
  {
    label: 'Archived',
    icon: 'i-heroicons-archive-box',
    badge: archivedGoals.value.length > 0 ? archivedGoals.value.length : undefined,
    value: 'archived',
    slot: 'archived',
  },
]);

// Create goal modal state
const showCreateModal = ref(false);
const initialGoalText = ref<string | null>(null);

// Check for suggested goal from query params
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  if (route.query.suggested === "true" && route.query.text) {
    initialGoalText.value = route.query.text as string;
    showCreateModal.value = true;

    // Wait for Vue to update and modal to populate, then clean URL
    await nextTick();
    setTimeout(() => {
      router.replace({ query: {} });
    }, 200);
  }
});

// Watch for modal close to reset state
watch(showCreateModal, (newValue) => {
  if (!newValue && initialGoalText.value) {
    initialGoalText.value = null;
  }
});

// Refresh handlers
const handleGoalChange = async () => {
  await refreshGoals();
};

const handleGoalCreated = async () => {
  await refreshGoals();
};
</script>
