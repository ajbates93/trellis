<script setup lang="ts">
import { format } from "date-fns";

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

interface Checkin {
  id: string;
  buddy: User;
  user: User;
  notes: string;
  reviewSchedule: {
    id: string;
    scheduledDate: string;
    name: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
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
    if (
      !isPending &&
      selectedBuddyId.value === null &&
      buddies.value.length > 0
    ) {
      selectedBuddyId.value = buddies.value[0].id;
    }
  },
  { immediate: true },
);

// Fetch buddy goals (filtered by buddyId) - reactive based on selectedBuddyId
const { data: buddyGoalsData, refresh: refreshBuddyGoals } = useFetch(() =>
  selectedBuddyId.value
    ? `/api/goals/buddies?buddyId=${selectedBuddyId.value}`
    : null,
);

// Fetch buddy check-ins (filtered by buddyId)
const { data: checkinsData, refresh: refreshCheckins } = useFetch(() =>
  selectedBuddyId.value
    ? `/api/checkins/buddy?buddyId=${selectedBuddyId.value}&limit=10`
    : null,
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

const checkins = computed(() => checkinsData.value || []) as Ref<Checkin[]>;

// Group goals by status
const activeGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "active"),
);
const completedGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "completed"),
);
const archivedGoals = computed(() =>
  buddyGoals.value.filter((g: Goal) => g.status === "archived"),
);

// Modal state
const showCheckinModal = ref(false);
const isCreatingCheckin = ref(false);
const showCheckinDetailsModal = ref(false);
const selectedCheckin = ref<Checkin | null>(null);
const isEditingCheckin = ref(false);
const editingNotes = ref("");
const isSubmittingEdit = ref(false);

// Table columns for checkins
const checkinColumns = [
  { id: "date", accessorKey: "createdAt", header: "Date" },
  {
    id: "notes",
    accessorKey: "notes",
    header: "Notes",
    meta: {
      class: {
        td: "max-w-md",
      },
    },
  },
  { id: "review", accessorKey: "reviewSchedule", header: "Review" },
];

// Open checkin details modal
const openCheckinDetailsModal = (checkin: Checkin) => {
  selectedCheckin.value = checkin;
  isEditingCheckin.value = false;
  editingNotes.value = "";
  showCheckinDetailsModal.value = true;
};

// Start editing checkin
const startEditingCheckin = () => {
  if (selectedCheckin.value) {
    editingNotes.value = selectedCheckin.value.notes;
    isEditingCheckin.value = true;
  }
};

// Save edited checkin
const saveEditedCheckin = async () => {
  if (!selectedCheckin.value || !editingNotes.value.trim()) {
    return;
  }

  isSubmittingEdit.value = true;

  try {
    const response = await $fetch(`/api/checkins/${selectedCheckin.value.id}`, {
      method: "PATCH",
      body: {
        notes: editingNotes.value.trim(),
      },
    });

    if (response.checkin) {
      selectedCheckin.value = {
        ...selectedCheckin.value,
        notes: response.checkin.notes,
        updatedAt: response.checkin.updatedAt,
      };
    }

    isEditingCheckin.value = false;
    await refreshCheckins();

    useToast().add({
      title: "Check-in updated",
      description: "Your check-in has been updated successfully.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to update check-in:", error);
    useToast().add({
      title: "Failed to update check-in",
      description: "An error occurred while updating the check-in.",
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmittingEdit.value = false;
  }
};

// Delete checkin
const deleteCheckin = async () => {
  if (!selectedCheckin.value) {
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this check-in? This action cannot be undone.",
    )
  ) {
    return;
  }

  isSubmittingEdit.value = true;

  try {
    await $fetch(`/api/checkins/${selectedCheckin.value.id}`, {
      method: "DELETE",
    });

    showCheckinDetailsModal.value = false;
    selectedCheckin.value = null;
    await refreshCheckins();

    useToast().add({
      title: "Check-in deleted",
      description: "Your check-in has been deleted successfully.",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error) {
    console.error("Failed to delete check-in:", error);
    useToast().add({
      title: "Failed to delete check-in",
      description: "An error occurred while deleting the check-in.",
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmittingEdit.value = false;
  }
};

// Refresh when buddy changes
watch(selectedBuddyId, async () => {
  await Promise.all([refreshBuddyGoals(), refreshCheckins()]);
});

// Handle buddy selection
const handleBuddySelected = (buddyId: string) => {
  selectedBuddyId.value = buddyId;
};

// Refresh handler for goal changes
const handleGoalChange = async () => {
  await refreshBuddyGoals();
};

// Handle check-in created
const handleCheckinCreated = async () => {
  await refreshCheckins();
};

// Submit check-in
const submitCheckin = async (notes: string) => {
  if (!selectedBuddyId.value) {
    return;
  }

  isCreatingCheckin.value = true;

  try {
    await $fetch("/api/checkins", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        notes: notes,
      },
    });

    useToast().add({
      title: "Check-in created",
      description: `Check-in recorded successfully.`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    await refreshCheckins();
  } catch (error) {
    console.error("Failed to create check-in:", error);
    useToast().add({
      title: "Failed to create check-in",
      description: "An error occurred while creating the check-in.",
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isCreatingCheckin.value = false;
  }
};

// Truncate notes for table display
const truncateNotes = (notes: string, length: number = 100): string => {
  if (notes.length <= length) return notes;
  return notes.substring(0, length) + "...";
};
</script>

<template>
  <UDashboardPanel id="buddy-goals">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <input type="text" v-model="checkinNotes" />
        <pre>{{ checkinNotes }}</pre>
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
              <div
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3"
              >
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
              <div
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3"
              >
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
              <div
                class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-3"
              >
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

          <!-- Check-Ins Section -->
          <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                💬 Check-Ins
              </h2>
              <UButton
                v-if="buddyInfo"
                @click="showCheckinModal = true"
                icon="i-heroicons-plus"
              >
                New Check-In
              </UButton>
            </div>

            <!-- Check-ins Table -->
            <UCard v-if="checkins.length > 0">
              <UTable :columns="checkinColumns" :data="checkins">
                <template #date-cell="{ row }">
                  <div class="text-sm">
                    {{
                      format(new Date(row.original.createdAt), "MMM d, yyyy")
                    }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ format(new Date(row.original.createdAt), "h:mm a") }}
                  </div>
                </template>

                <template #notes-cell="{ row }">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    class="w-full truncate text-left justify-start font-normal px-0 -mx-2.5 block overflow-hidden"
                    @click="openCheckinDetailsModal(row.original)"
                  >
                    <span class="truncate block">{{ row.original.notes }}</span>
                  </UButton>
                </template>

                <template #review-cell="{ row }">
                  <div v-if="row.original.reviewSchedule">
                    <UBadge
                      :label="row.original.reviewSchedule.name"
                      :color="
                        row.original.reviewSchedule.status === 'completed'
                          ? 'success'
                          : 'warning'
                      "
                    />
                  </div>
                  <div v-else class="text-xs text-gray-500">Not assigned</div>
                </template>
              </UTable>
            </UCard>

            <!-- Empty State -->
            <div v-else class="text-center py-8 text-gray-500">
              <p class="text-sm">
                No check-ins recorded yet. Start tracking conversations with
                {{ buddyInfo?.name }}.
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- Check-in Creation Modal -->
    </template>
  </UDashboardPanel>

  <!-- Check-in Modal -->
  <CheckinModal
    v-model="showCheckinModal"
    :buddy="buddyInfo"
    :is-loading="isCreatingCheckin"
    @submit="submitCheckin"
  />

  <!-- Check-in Details Modal -->
  <UModal
    v-if="selectedCheckin"
    v-model:open="showCheckinDetailsModal"
    size="lg"
  >
    <template #header>
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Check-in Details
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{
              format(
                new Date(selectedCheckin.createdAt),
                "MMM d, yyyy 'at' h:mm a",
              )
            }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="selectedCheckin" class="space-y-4">
        <div>
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
          >
            Conducted by
          </p>
          <div class="flex items-center gap-2">
            <UAvatar
              :src="selectedCheckin.buddy.avatarUrl"
              :alt="selectedCheckin.buddy.name"
              size="sm"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ selectedCheckin.buddy.name }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedCheckin.buddy.email }}
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
          >
            Notes
          </p>
          <div
            v-if="!isEditingCheckin"
            class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <p class="text-gray-900 dark:text-white whitespace-pre-wrap">
              {{ selectedCheckin.notes }}
            </p>
          </div>
          <div v-else class="space-y-2">
            <UTextarea
              v-model="editingNotes"
              :rows="6"
              :disabled="isSubmittingEdit"
              class="w-full"
            />
            <div class="flex gap-2 justify-end">
              <UButton
                variant="ghost"
                :disabled="isSubmittingEdit"
                @click="isEditingCheckin = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="isSubmittingEdit"
                :disabled="!editingNotes.trim() || isSubmittingEdit"
                @click="saveEditedCheckin"
              >
                Save Changes
              </UButton>
            </div>
          </div>
        </div>

        <div
          v-if="selectedCheckin.reviewSchedule"
          class="border-t border-gray-200 dark:border-gray-700 pt-4"
        >
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
          >
            Linked Review
          </p>
          <UBadge
            :label="selectedCheckin.reviewSchedule.name"
            :color="
              selectedCheckin.reviewSchedule.status === 'completed'
                ? 'success'
                : 'warning'
            "
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
          v-if="!isEditingCheckin"
          color="error"
          :disabled="isSubmittingEdit"
          @click="deleteCheckin"
        >
          Delete
        </UButton>
        <div v-else></div>
        <div class="flex gap-2">
          <UButton
            color="primary"
            :disabled="isSubmittingEdit || isEditingCheckin"
            @click="showCheckinDetailsModal = false"
          >
            Close
          </UButton>
          <UButton
            v-if="!isEditingCheckin"
            color="warning"
            @click="startEditingCheckin"
            :disabled="isSubmittingEdit"
          >
            Edit
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
