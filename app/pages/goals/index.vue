<template>
  <UDashboardPanel id="goals">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header with Add button -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
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
v-model="activeTab" :items="tabItems" variant="pill" color="neutral" size="lg" class="w-full" :ui="{
          list: 'bg-gray-200 dark:bg-gray-800 rounded-xl p-1',
          trigger:
            'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
          indicator: 'bg-white dark:bg-gray-900 shadow-sm',
        }">
          <!-- Active Goals Tab -->
          <template #active>
            <div class="pt-6">
              <!-- Empty state -->
              <EmptyState
v-if="activeGoals.length === 0" icon="i-heroicons-rocket-launch" heading="Set your first goal"
                description="Goals help you track your professional development. Start with something you want to achieve this quarter."
                button-text="Create Your First Goal" button-icon="i-heroicons-plus" variant="primary"
                @button-click="showCreateModal = true" />

              <!-- Goals grid -->
              <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <GoalsGoalCard
v-for="goal in activeGoals" :key="goal.id" :goal="goal" mode="owner"
                  @status-changed="handleGoalChange" @deleted="handleGoalChange" @updated="handleGoalChange" />
              </div>
            </div>
          </template>

          <!-- Completed Goals Tab -->
          <template #completed>
            <div class="pt-6">
              <!-- Empty state -->
              <EmptyState
v-if="completedGoals.length === 0" icon="i-heroicons-trophy" icon-color="text-amber-500"
                icon-bg-color="bg-amber-100 dark:bg-amber-900/30" heading="No completed goals yet"
                description="Keep working on your active goals. When you complete them, they'll appear here as achievements!"
                variant="secondary" />

              <!-- Goals grid -->
              <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <GoalsGoalCard
v-for="goal in completedGoals" :key="goal.id" :goal="goal" mode="owner"
                  @status-changed="handleGoalChange" @deleted="handleGoalChange" @updated="handleGoalChange" />
              </div>
            </div>
          </template>

          <!-- Archived Goals Tab -->
          <template #archived>
            <div class="pt-6">
              <!-- Empty state -->
              <EmptyState
v-if="archivedGoals.length === 0" icon="i-heroicons-archive-box" icon-color="text-gray-400"
                icon-bg-color="bg-gray-200 dark:bg-gray-700" heading="No archived goals" variant="minimal" />

              <!-- Goals grid -->
              <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <GoalsGoalCard
v-for="goal in archivedGoals" :key="goal.id" :goal="goal" mode="owner"
                  @status-changed="handleGoalChange" @deleted="handleGoalChange" @updated="handleGoalChange" />
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Goal Modal -->
  <GoalsGoalModal
:is-open="showCreateModal" mode="create" :goal="initialGoal"
    @update:is-open="showCreateModal = $event" @success="handleGoalCreated" />
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type { GoalWithMilestones } from "~/types";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Goals",
});

// Fetch user's own goals
const { data: goalsData, refresh: refreshGoals } = await useApi("/goals");
const myGoals = computed(
  () => (goalsData.value?.goals || []) as GoalWithMilestones[],
);

// Group goals by status
const activeGoals = computed(() =>
  myGoals.value.filter((g) => g.status === "active"),
);
const completedGoals = computed(() =>
  myGoals.value.filter((g) => g.status === "completed"),
);
const archivedGoals = computed(() =>
  myGoals.value.filter((g) => g.status === "archived"),
);

// Tab state
const activeTab = ref("active");

// Tab items with icons and badges
const tabItems = computed<TabsItem[]>(() => [
  {
    label: "Active",
    icon: "i-heroicons-fire",
    badge: activeGoals.value.length > 0 ? activeGoals.value.length : undefined,
    value: "active",
    slot: "active",
  },
  {
    label: "Completed",
    icon: "i-heroicons-check-badge",
    badge:
      completedGoals.value.length > 0 ? completedGoals.value.length : undefined,
    value: "completed",
    slot: "completed",
  },
  {
    label: "Archived",
    icon: "i-heroicons-archive-box",
    badge:
      archivedGoals.value.length > 0 ? archivedGoals.value.length : undefined,
    value: "archived",
    slot: "archived",
  },
]);

// Create goal modal state
const showCreateModal = ref(false);
const initialGoalText = ref<string | null>(null);

// Pre-filled goal for the create modal (GoalModal expects a full
// GoalWithMilestones, so unset fields are stubbed out).
const initialGoal = computed<GoalWithMilestones | null>(() =>
  initialGoalText.value
    ? {
        id: "",
        userId: "",
        goalText: initialGoalText.value,
        description: null,
        status: null,
        targetDate: null,
        createdAt: null,
        updatedAt: null,
        completedAt: null,
        milestones: [],
      }
    : null,
);

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
