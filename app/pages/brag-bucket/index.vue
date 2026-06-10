<template>
  <UDashboardPanel id="brag-bucket">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Brag Bucket
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Celebrate your achievements and wins throughout the year
          </p>
        </div>

        <!-- Stats Banner -->
        <div class="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard class="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Achievements
                </p>
                <p class="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {{ achievements.length }}
                </p>
              </div>
              <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-teal-500 dark:text-teal-400" />
            </div>
          </UCard>

          <UCard class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Year
                </p>
                <p class="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {{ thisYearCount }}
                </p>
              </div>
              <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
          </UCard>
        </div>

        <!-- Add Button -->
        <div class="mb-8">
          <UButton color="primary" size="lg" icon="i-heroicons-plus-20-solid" @click="openCreateModal">
            Add Achievement
          </UButton>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white text-center">
            Your Achievement Timeline
          </h2>
          <div class="relative">
            <!-- Center line -->
            <div class="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            <div class="space-y-12">
              <div v-for="i in 3" :key="i" class="relative">
                <!-- Timeline dot -->
                <div class="absolute left-1/2 -translate-x-1/2 top-8 w-3 h-3 bg-primary-500 rounded-full z-10" />
                <!-- Card container -->
                <div class="grid grid-cols-2 gap-8">
                  <div :class="i % 2 === 1 ? 'col-start-1' : 'col-start-2'">
                    <UCard class="animate-pulse">
                      <div class="space-y-3">
                        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                      </div>
                    </UCard>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline View -->
        <div v-else-if="sortedAchievements.length > 0" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white text-center">
            Your Achievement Timeline
          </h2>

          <div class="relative">
            <!-- Center timeline line -->
            <div class="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <!-- Timeline items -->
            <div class="space-y-12">
              <template
v-for="item in timelineItems" :key="
                  item.type === 'year'
                    ? `year-${item.year}`
                    : item.achievement.id
                ">
                <!-- Year marker -->
                <div v-if="item.type === 'year'" class="relative flex justify-center">
                  <div
                    class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 z-10 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 select-none"
                    @click="toggleYear(item.year)">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {{ item.year }}
                      <UIcon
:name="expandedYears[item.year]
                          ? 'i-heroicons-chevron-down'
                          : 'i-heroicons-chevron-right'
                        " class="w-4 h-4 transition-transform duration-200" />
                    </span>
                  </div>
                </div>

                <!-- Achievement item -->
                <Transition v-if="item.type === 'achievement'" name="achievement" appear>
                  <div
v-if="
                    expandedYears[getYearForAchievement(item.achievement)]
                  " class="relative group">
                    <!-- Timeline dot -->
                    <div
                      class="absolute left-1/2 -translate-x-1/2 top-8 w-3 h-3 bg-primary-500 rounded-full z-10 group-hover:scale-150 transition-transform duration-200" />

                    <!-- Grid for alternating layout -->
                    <div class="grid grid-cols-2 gap-8 items-start">
                      <!-- Left side -->
                      <div class="text-right">
                        <template v-if="item.displayIndex % 2 === 0">
                          <!-- Card on left -->
                          <AchievementsAchievementCard
:achievement="item.achievement" align="right"
                            @updated="refreshAchievements" @deleted="refreshAchievements" @edit="editAchievement" />
                        </template>
                        <template v-else>
                          <!-- Date on left -->
                          <div class="pr-4 pt-4">
                            <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {{ formatMonth(item.achievement.achievedDate) }}
                            </p>
                            <p class="text-4xl font-bold text-gray-900 dark:text-white">
                              {{ formatDay(item.achievement.achievedDate) }}
                            </p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                              {{ formatYear(item.achievement.achievedDate) }}
                            </p>
                          </div>
                        </template>
                      </div>

                      <!-- Right side -->
                      <div>
                        <template v-if="item.displayIndex % 2 === 0">
                          <!-- Date on right -->
                          <div class="pl-4 pt-4">
                            <p class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {{ formatMonth(item.achievement.achievedDate) }}
                            </p>
                            <p class="text-4xl font-bold text-gray-900 dark:text-white">
                              {{ formatDay(item.achievement.achievedDate) }}
                            </p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                              {{ formatYear(item.achievement.achievedDate) }}
                            </p>
                          </div>
                        </template>
                        <template v-else>
                          <!-- Card on right -->
                          <AchievementsAchievementCard
:achievement="item.achievement" align="left"
                            @updated="refreshAchievements" @deleted="refreshAchievements" @edit="editAchievement" />
                        </template>
                      </div>
                    </div>
                  </div>
                </Transition>
              </template>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <EmptyState
v-else icon="i-heroicons-trophy" icon-color="text-teal-500"
          icon-bg-color="bg-teal-100 dark:bg-teal-900/30" heading="Your Brag Bucket is empty"
          description="Start adding achievements as they happen. At review time, you'll have a complete list to celebrate!"
          button-text="Add Your First Achievement" button-icon="i-heroicons-plus-20-solid" variant="primary"
          @button-click="openCreateModal" />
        <!-- Achievement Modal -->
        <AchievementsAchievementModal
v-model:is-open="isModalOpen" :mode="modalMode" :achievement="selectedAchievement"
          @success="onModalSuccess" />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { format } from "date-fns";
import type { Ref } from "vue";

useHead({
  title: "Brag Bucket",
});

interface Achievement {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  achievedDate: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

type TimelineItem =
  | { type: "year"; year: number }
  | { type: "achievement"; achievement: Achievement; displayIndex: number };

const achievements: Ref<Achievement[]> = ref([]);
const isLoading = ref(true);
const isModalOpen = ref(false);
const modalMode = ref<"create" | "edit">("create");
const selectedAchievement = ref<Achievement | null>(null);
const expandedYears = ref<Record<number, boolean>>({});

// Date formatting helpers
const formatMonth = (dateStr: string) => format(new Date(dateStr), "MMM");
const formatDay = (dateStr: string) => format(new Date(dateStr), "dd");
const formatYear = (dateStr: string) => format(new Date(dateStr), "yyyy");

// Sort achievements chronologically (oldest first)
const sortedAchievements = computed(() => {
  return [...achievements.value].sort((a, b) => {
    return (
      new Date(a.achievedDate).getTime() - new Date(b.achievedDate).getTime()
    );
  });
});

// Build timeline items with year markers
const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = [];
  let currentYear: number | null = null;
  let displayIndex = 0;

  for (const achievement of sortedAchievements.value) {
    const year = new Date(achievement.achievedDate).getFullYear();

    // Add year marker if this is a new year
    if (year !== currentYear) {
      items.push({ type: "year", year });
      currentYear = year;
    }

    items.push({
      type: "achievement",
      achievement,
      displayIndex: displayIndex++,
    });
  }

  return items;
});

// Helper function to get year for an achievement
const getYearForAchievement = (achievement: Achievement): number => {
  return new Date(achievement.achievedDate).getFullYear();
};

// Toggle year expansion
const toggleYear = (year: number) => {
  expandedYears.value[year] = !expandedYears.value[year];
};

// Initialize all years as expanded
const initializeExpandedYears = () => {
  const years = new Set(
    achievements.value.map((a) => new Date(a.achievedDate).getFullYear()),
  );
  years.forEach((year) => {
    if (!(year in expandedYears.value)) {
      expandedYears.value[year] = true;
    }
  });
};

// Fetch achievements on mount
const refreshAchievements = async () => {
  isLoading.value = true;
  try {
    const response = await $api("/achievements", { method: "GET" });
    if (response) {
      achievements.value = response.achievements || [];
      initializeExpandedYears();
    }
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
    useToast().add({
      title: "Failed to load achievements",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const thisYearCount = computed(() => {
  const currentYear = new Date().getFullYear();
  return achievements.value.filter((a) => {
    const achievedYear = new Date(a.achievedDate).getFullYear();
    return achievedYear === currentYear;
  }).length;
});

const openCreateModal = () => {
  modalMode.value = "create";
  selectedAchievement.value = null;
  isModalOpen.value = true;
};

const editAchievement = (achievement: Achievement) => {
  modalMode.value = "edit";
  selectedAchievement.value = achievement;
  isModalOpen.value = true;
};

const onModalSuccess = async () => {
  await refreshAchievements();
};

onMounted(async () => {
  await refreshAchievements();
});
</script>

<style scoped>
/* Transition for achievement items */
.achievement-enter-active,
.achievement-leave-active {
  transition: all 0.3s ease;
}

.achievement-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.achievement-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
  margin: 0;
}

.achievement-enter-to,
.achievement-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
