<template>
  <UDashboardPanel id="goals">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Goals
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Track and manage your personal development goals
          </p>
        </div>

        <div class="space-y-6">
          <!-- Tabs (conditionally shown) -->
          <UTabs
            v-if="showBuddyTab"
            v-model="selectedTab"
            :items="tabs"
            class="w-full"
          />

          <!-- My Goals Tab -->
          <div
            v-if="!showBuddyTab || selectedTab === 'my-goals'"
            class="space-y-6"
          >
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
                  label: 'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer'
                }
              }"
            >
              <template #active-goals>
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3">
                  <div
                    v-if="activeGoals.length === 0"
                    class="col-span-full text-center py-8 text-gray-500"
                  >
                    No active goals yet. Create one to get started!
                  </div>
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
                  label: 'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer'
                }
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
                    mode="owner"
                    @status-changed="handleGoalChange"
                    @deleted="handleGoalChange"
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
                  label: 'text-lg font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer'
                }
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
                    mode="owner"
                    @status-changed="handleGoalChange"
                    @deleted="handleGoalChange"
                    @updated="handleGoalChange"
                  />
                </div>
              </template>
            </UAccordion>

            <!-- Add New Goal Button -->
            <div class="pt-4">
              <UButton icon="i-heroicons-plus" @click="showCreateModal = true">
                Add New Goal
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Goal Modal (positioned outside the dashboard panel) -->
  <GoalsGoalModal
    :is-open="showCreateModal"
    @update:is-open="showCreateModal = $event"
    mode="create"
    :goal="initialGoalText ? { goalText: initialGoalText, description: null, targetDate: null, id: '' } : null"
    @success="handleGoalCreated"
  />
</template>

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

interface BuddyAssignment {
  user: User;
  goals: Goal[];
}

definePageMeta({
  layout: "default",
});

// Fetch user's own goals
const { data: goalsData, refresh: refreshGoals } = await useFetch("/api/goals");
const myGoals = computed(() => (goalsData.value?.goals || []) as Goal[]);

// Fetch buddy goals
const { data: buddyData, refresh: refreshBuddyGoals } =
  await useFetch("/api/goals/buddies");
const buddyAssignments = computed(() => {
  const assignments = buddyData.value?.buddyAssignments || [];
  return assignments as unknown as BuddyAssignment[];
});

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
const selectedTab = ref("my-goals");

// Show buddy tab only if user is buddying someone
const showBuddyTab = computed(() => buddyAssignments.value.length > 0);

const tabs = computed(() => {
  const baseTabs = [{ label: "My Goals", value: "my-goals" }];
  if (showBuddyTab.value) {
    baseTabs.push({ label: "My Buddies' Goals", value: "buddy-goals" });
  }
  return baseTabs;
});

// Create goal modal state
const showCreateModal = ref(false);
const initialGoalText = ref<string | null>(null);

// Check for suggested goal from query params
const route = useRoute();
const router = useRouter();

onMounted(() => {
  if (route.query.suggested === 'true' && route.query.text) {
    initialGoalText.value = route.query.text as string;
    showCreateModal.value = true;
  }
});

// Watch for modal close to clear query params and reset state
watch(showCreateModal, (newValue) => {
  if (!newValue && initialGoalText.value) {
    // Modal closed, clear the URL params and initial text
    router.replace({ query: {} });
    initialGoalText.value = null;
  }
});

// Refresh handlers
const handleGoalChange = async () => {
  await refreshGoals();
};

const handleBuddyGoalChange = async () => {
  await refreshBuddyGoals();
};

const handleGoalCreated = async () => {
  await refreshGoals();
};
</script>
