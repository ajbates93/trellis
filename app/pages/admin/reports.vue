<template>
  <UDashboardPanel id="admin-reports">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-2">
            <UIcon
              name="i-heroicons-chart-bar"
              class="text-blue-500 text-3xl"
            />
            <h1
              class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
            >
              Reports
            </h1>
          </div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View com, achievements, and goals for any user
          </p>
        </div>

        <!-- User Selector -->
        <UCard class="mb-8">
          <div
            class="flex flex-col sm:flex-row gap-4 items-end sm:items-center"
          >
            <div class="w-full sm:w-96">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
              >
                Select User
              </label>

              <ClientOnly>
                <USelectMenu
                  :model-value="selectedUser"
                  :items="users"
                  option-attribute="name"
                  searchable
                  class="w-80"
                  :loading="loadingUsers"
                  @update:model-value="(user) => (selectedUser = user)"
                >
                  <template #leading>
                    <div
                      v-if="selectedUser"
                      class="flex items-center gap-2 truncate"
                    >
                      <UAvatar
                        :src="selectedUser.avatarUrl || undefined"
                        :alt="selectedUser.name"
                        size="2xs"
                      />
                      <span class="truncate">{{ selectedUser.name }}</span>
                    </div>
                    <span v-else class="text-gray-400 truncate"
                      >Search for a user...</span
                    >
                  </template>
                  <template #item="{ item: option }">
                    <div class="flex items-center gap-2">
                      <UAvatar
                        :src="option.avatarUrl || undefined"
                        :alt="option.name"
                        size="2xs"
                      />
                      <div class="flex flex-col text-left">
                        <span class="font-medium">{{ option.name }}</span>
                        <span class="text-xs text-gray-500">{{
                          option.email
                        }}</span>
                      </div>
                    </div>
                  </template>
                  <template #trailing>
                    <UButton
                      v-if="selectedUser"
                      color="gray"
                      variant="link"
                      icon="i-heroicons-x-mark"
                      :padded="false"
                      @click.stop="selectedUser = null"
                    />
                    <UIcon
                      v-else
                      name="i-heroicons-chevron-down-20-solid"
                      class="w-5 h-5 text-gray-400 dark:text-gray-500"
                    />
                  </template>
                </USelectMenu>
              </ClientOnly>
            </div>
          </div>
        </UCard>

        <!-- Report Content -->
        <div v-if="selectedUser" class="space-y-8">
          <!-- Reviews Section -->
          <section>
            <h2
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-clipboard-document-check"
                class="text-primary-500"
              />
              Past Reviews
            </h2>

            <div v-if="loadingReviews" class="text-center py-8">
              <UIcon
                name="i-heroicons-arrow-path"
                class="animate-spin text-2xl text-gray-400"
              />
            </div>

            <div
              v-else-if="reviews.length === 0"
              class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <p class="text-gray-500">
                No completed reviews found for this user.
              </p>
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="review in reviews"
                :key="review.id"
                :to="`/reviews/${review.id}`"
                class="block group"
              >
                <UCard
                  class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
                >
                  <div class="flex justify-between items-start mb-4">
                    <UBadge
                      :label="formatDate(review.completedDate)"
                      color="neutral"
                      variant="solid"
                    />
                    <UIcon
                      name="i-heroicons-arrow-right"
                      class="text-gray-400 group-hover:text-primary-500"
                    />
                  </div>
                  <h3 class="font-bold text-lg mb-1">{{ review.name }}</h3>
                  <div
                    class="flex items-center gap-2 text-sm text-gray-500 mb-4"
                  >
                    <UIcon name="i-heroicons-user" class="w-4 h-4" />
                    <span>Buddy: {{ review.buddy?.name || "Unassigned" }}</span>
                  </div>
                  <div
                    v-if="review.completionNotes"
                    class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
                  >
                    {{ review.completionNotes }}
                  </div>
                </UCard>
              </NuxtLink>
            </div>
          </section>

          <!-- Achievements Section -->
          <section>
            <h2
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-star" class="text-yellow-500" />
              Achievements (Last 12 Months)
            </h2>

            <div v-if="loadingAchievements" class="text-center py-8">
              <UIcon
                name="i-heroicons-arrow-path"
                class="animate-spin text-2xl text-gray-400"
              />
            </div>

            <div
              v-else-if="achievements.length === 0"
              class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <p class="text-gray-500">
                No achievements recorded in the last year.
              </p>
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <div
                v-for="achievement in achievements"
                :key="achievement.id"
                class="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"
                  >
                    <UIcon
                      name="i-heroicons-trophy"
                      class="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                    />
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {{ achievement.title }}
                    </h3>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ formatDate(achievement.achievedDate) }}
                    </p>
                    <p
                      v-if="achievement.description"
                      class="text-sm text-gray-600 dark:text-gray-300 mt-2"
                    >
                      {{ achievement.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Goals Section -->
          <section>
            <h2
              class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-flag" class="text-green-500" />
              Current Goals
            </h2>

            <div v-if="loadingGoals" class="text-center py-8">
              <UIcon
                name="i-heroicons-arrow-path"
                class="animate-spin text-2xl text-gray-400"
              />
            </div>

            <div
              v-else-if="goals.length === 0"
              class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <p class="text-gray-500">No active goals found.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="goal in goals"
                :key="goal.id"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {{ goal.goalText }}
                      </h3>
                      <UBadge
                        :label="goal.status"
                        :color="getGoalStatusColor(goal.status)"
                        size="xs"
                      />
                    </div>
                    <p class="text-sm text-gray-500">
                      Target: {{ formatDate(goal.targetDate) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-bold text-primary-500">
                      {{ calculateProgress(goal) }}%
                    </span>
                    <p class="text-xs text-gray-500">Completed</p>
                  </div>
                </div>

                <!-- Milestones -->
                <div
                  v-if="goal.milestones?.length"
                  class="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
                >
                  <div
                    v-for="milestone in goal.milestones"
                    :key="milestone.id"
                    class="flex items-center gap-3 text-sm"
                  >
                    <UIcon
                      :name="
                        milestone.isCompleted
                          ? 'i-heroicons-check-circle'
                          : 'i-heroicons-stop'
                      "
                      :class="
                        milestone.isCompleted
                          ? 'text-green-500'
                          : 'text-gray-300'
                      "
                      class="w-5 h-5"
                    />
                    <span
                      :class="{
                        'text-gray-500 line-through': milestone.isCompleted,
                      }"
                    >
                      {{ milestone.title }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700"
        >
          <UIcon name="i-heroicons-user" class="text-6xl text-gray-300 mb-4" />
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a User
          </h3>
          <p class="text-gray-500 max-w-sm mx-auto">
            Choose a user from the dropdown above to view their performance
            report, reviews, and goals.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { format } from "date-fns";
import type { User } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

const users = ref<User[]>([]);
const selectedUser = ref<User | null>(null);
const loadingUsers = ref(false);

const reviews = ref<any[]>([]);
const achievements = ref<any[]>([]);
const goals = ref<any[]>([]);

const loadingReviews = ref(false);
const loadingAchievements = ref(false);
const loadingGoals = ref(false);

// Fetch users for selector
const fetchUsers = async () => {
  loadingUsers.value = true;
  try {
    const data = await $fetch("/api/admin/users");
    if (data) {
      users.value = data.users;
    }
  } catch (e) {
    console.error("Failed to load users:", e);
  } finally {
    loadingUsers.value = false;
  }
};

// Fetch user data when selected
watch(selectedUser, async (user) => {
  if (!user) {
    reviews.value = [];
    achievements.value = [];
    goals.value = [];
    return;
  }

  // Fetch Reviews
  loadingReviews.value = true;
  try {
    const data = await $fetch("/api/reviews/past", {
      query: { userId: user.id },
    });
    reviews.value = data.reviews || [];
  } catch (e) {
    console.error("Failed to load reviews:", e);
  } finally {
    loadingReviews.value = false;
  }

  // Fetch Achievements
  loadingAchievements.value = true;
  try {
    const data = await $fetch("/api/achievements", {
      query: { userId: user.id },
    });
    achievements.value = data.achievements || [];
  } catch (e) {
    console.error("Failed to load achievements:", e);
  } finally {
    loadingAchievements.value = false;
  }

  // Fetch Goals
  loadingGoals.value = true;
  try {
    const data = await $fetch("/api/goals", {
      query: { userId: user.id },
    });
    goals.value = data.goals || [];
  } catch (e) {
    console.error("Failed to load goals:", e);
  } finally {
    loadingGoals.value = false;
  }
});

const formatDate = (date: string) => {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
};

const getGoalStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "at_risk":
      return "error";
    default:
      return "neutral";
  }
};

const calculateProgress = (goal: any) => {
  if (!goal.milestones || goal.milestones.length === 0) return 0;
  const completed = goal.milestones.filter((m: any) => m.isCompleted).length;
  return Math.round((completed / goal.milestones.length) * 100);
};

onMounted(() => {
  fetchUsers();
});
</script>
