<template>
  <UDashboardPanel id="brag-bucket">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            🎉 Brag Bucket
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Celebrate your achievements and wins throughout the year
          </p>
        </div>

        <!-- Stats Banner -->
        <div class="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard
            class="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20"
          >
            <template #body>
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    Total Achievements
                  </p>
                  <p
                    class="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400"
                  >
                    {{ achievements.length }}
                  </p>
                </div>
                <div class="text-4xl">🏆</div>
              </div>
            </template>
          </UCard>

          <UCard
            class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
          >
            <template #body>
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    This Year
                  </p>
                  <p
                    class="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400"
                  >
                    {{ thisYearCount }}
                  </p>
                </div>
                <div class="text-4xl">⭐</div>
              </div>
            </template>
          </UCard>
        </div>

        <!-- Add Button -->
        <div class="mb-8">
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-plus-20-solid"
            @click="openCreateModal"
          >
            Add Achievement
          </UButton>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Your Achievement Timeline
          </h2>
          <div class="relative pl-8 space-y-6">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-green-400 dark:from-teal-600 dark:to-green-600"></div>
            <div v-for="i in 3" :key="i" class="relative group">
              <div class="absolute -left-5 top-3 w-4 h-4 bg-teal-500 dark:bg-teal-400 rounded-full border-4 border-white dark:border-gray-900 shadow-md"></div>
              <UCard class="animate-pulse">
                <template #body>
                  <div class="space-y-3">
                    <div class="h-4 bg-gray-700 dark:bg-gray-600 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-700 dark:bg-gray-600 rounded w-1/4"></div>
                    <div class="h-12 bg-gray-700 dark:bg-gray-600 rounded"></div>
                  </div>
                </template>
              </UCard>
            </div>
          </div>
        </div>

        <!-- Timeline View -->
        <div v-else-if="achievements.length > 0" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Your Achievement Timeline
          </h2>

          <div class="relative pl-8">
            <!-- Timeline line -->
            <div
              class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-green-400 dark:from-teal-600 dark:to-green-600"
            ></div>

            <!-- Achievement cards -->
            <div class="space-y-6 pl-8">
              <div
                v-for="(achievement, index) in achievements"
                :key="achievement.id"
                class="relative group"
              >
                <!-- Timeline dot -->
                <div
                  class="absolute -left-5 top-3 w-4 h-4 bg-teal-500 dark:bg-teal-400 rounded-full border-4 border-white dark:border-gray-900 shadow-md group-hover:scale-125 transition-transform duration-200"
                ></div>

                <!-- Achievement card -->
                <AchievementsAchievementCard
                  :achievement="achievement"
                  @updated="refreshAchievements"
                  @deleted="refreshAchievements"
                  @edit="editAchievement"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-12">
          <div class="text-5xl mb-4">🪣</div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Your Brag Bucket is empty
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Start adding achievements as they happen. At review time, you'll
            have a complete list to celebrate!
          </p>
          <UButton
            color="primary"
            icon="i-heroicons-plus-20-solid"
            @click="openCreateModal"
          >
            Add Your First Achievement
          </UButton>
        </div>
        <!-- Achievement Modal -->
        <AchievementsAchievementModal
          v-model:isOpen="isModalOpen"
          :mode="modalMode"
          :achievement="selectedAchievement"
          @success="onModalSuccess"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { Ref } from "vue";

interface Achievement {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  achievedDate: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

const achievements: Ref<Achievement[]> = ref([]);
const isLoading = ref(true);
const isModalOpen = ref(false);
const modalMode = ref<"create" | "edit">("create");
const selectedAchievement = ref<Achievement | null>(null);

// Fetch achievements on mount
const refreshAchievements = async () => {
  isLoading.value = true;
  try {
    const response = await $fetch("/api/achievements");
    if (response) {
      achievements.value = response.achievements || [];
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
