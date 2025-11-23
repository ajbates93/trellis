<script setup lang="ts">
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

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarUrl: string | null;
}

definePageMeta({
  layout: "default",
  middleware: "buddy",
});

const { buddies, pending } = useBuddies();

// Initialize selected buddy - null until buddies load
const selectedBuddyId = ref<string | null>(null);

// Auto-select first buddy when they load
watch(
  () => pending.value,
  (isPending) => {
    if (!isPending && selectedBuddyId.value === null && buddies.value.length > 0) {
      selectedBuddyId.value = buddies.value[0].id;
    }
  },
  { immediate: true },
);

// Fetch buddy goals (filtered by buddyId) - reactive based on selectedBuddyId
const { data: buddyGoalsData, refresh: refreshBuddyGoals } = useFetch(
  () => selectedBuddyId.value ? `/api/goals/buddies?buddyId=${selectedBuddyId.value}` : null
);

const buddyGoals = computed(() => {
  const assignments = buddyGoalsData.value?.buddyAssignments || [];
  if (assignments.length > 0) {
    return (assignments[0].goals || []) as Goal[];
  }
  return [];
});

const buddyInfo = computed(() => {
  const assignments = buddyGoalsData.value?.buddyAssignments || [];
  if (assignments.length > 0) {
    return assignments[0].user as User;
  }
  return null;
});

// Group goals by status
const activeGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "active")
);
const completedGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "completed")
);
const archivedGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "archived")
);

// Refresh when buddy changes
watch(selectedBuddyId, async () => {
  await refreshBuddyGoals();
});

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Refresh handler for goal changes
const handleGoalChange = async () => {
  await refreshBuddyGoals();
};
</script>

<template>
  <UDashboardPanel id="buddy-goals">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Buddy Goals
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and comment on your buddy's development goals
          </p>
        </div>

        <!-- Buddy Selector -->
        <div class="mb-6">
          <BuddySelector
            :buddy-id="selectedBuddyId || undefined"
            @buddy-selected="handleBuddySelected"
          />
        </div>

        <!-- Goals Content -->
        <div v-if="selectedBuddyId && buddyInfo" class="space-y-6">
          <!-- Active Goals Accordion -->
          <UAccordion
            :items="[
              {
                label: `🎯 Active Goals (${activeGoals.length})`,
                slot: 'active-goals',
                defaultOpen: true,
              },
            ]"
            :ui="{
              item: {
                base: 'mb-4',
                label:
                  'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer',
              },
            }"
          >
            <template #active-goals>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3">
                <div
                  v-if="activeGoals.length === 0"
                  class="col-span-full text-center py-8 text-gray-500"
                >
                  {{ buddyInfo.name }} doesn't have any active goals yet
                </div>
                <GoalsGoalCard
                  v-for="goal in activeGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="buddy"
                  @status-changed="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </template>
          </UAccordion>

          <!-- Completed Goals Accordion -->
          <UAccordion
            :items="[
              {
                label: `✅ Completed Goals (${completedGoals.length})`,
                slot: 'completed-goals',
                defaultOpen: false,
              },
            ]"
            :ui="{
              item: {
                base: 'mb-4',
                label:
                  'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer',
              },
            }"
          >
            <template #completed-goals>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3">
                <div
                  v-if="completedGoals.length === 0"
                  class="col-span-full text-center py-8 text-gray-500"
                >
                  No completed goals yet
                </div>
                <GoalsGoalCard
                  v-for="goal in completedGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="buddy"
                  @status-changed="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </template>
          </UAccordion>

          <!-- Archived Goals Accordion -->
          <UAccordion
            :items="[
              {
                label: `📦 Archived Goals (${archivedGoals.length})`,
                slot: 'archived-goals',
                defaultOpen: false,
              },
            ]"
            :ui="{
              item: {
                base: 'mb-4',
                label:
                  'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer',
              },
            }"
          >
            <template #archived-goals>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3">
                <div
                  v-if="archivedGoals.length === 0"
                  class="col-span-full text-center py-8 text-gray-500"
                >
                  No archived goals
                </div>
                <GoalsGoalCard
                  v-for="goal in archivedGoals"
                  :key="goal.id"
                  :goal="goal"
                  mode="buddy"
                  @status-changed="handleGoalChange"
                  @updated="handleGoalChange"
                />
              </div>
            </template>
          </UAccordion>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
